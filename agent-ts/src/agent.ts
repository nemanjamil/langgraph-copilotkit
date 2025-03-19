import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { Command, END, MemorySaver, StateGraph } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { convertActionsToDynamicStructuredTools, CopilotKitStateAnnotation } from "@copilotkit/sdk-js/langgraph";
import { SystemMessage } from "@langchain/core/messages";

// Initialize the LLM with configuration
const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0,
    apiKey: "YOUR API KEY HERE",
});

// Define graph state with message annotations
const AgentStateAnnotation = Annotation.Root({
  // ...MessagesAnnotation.spec,
    ...CopilotKitStateAnnotation.spec,
    agentName: Annotation<string>(),
    towns: Annotation<Record<string, string>>(),
    townLimit: Annotation<number>(),
});

export type AgentState = typeof AgentStateAnnotation.State;

const addTownTool = tool(
    (input: { town_name: string; description: string }) => "",
    {
        name: "add_town",
        description: "Add a new town with its description to the list.",
        schema: z.object({
            town_name: z.string().describe("The name of the town to add."),
            description: z.string().describe("Detailed description of the town.")
        }),
    }
);

const getTownDetailTool = tool(
    (input: { town_name: string }) => "",
    {
        name: "get_town_details",
        description: "Get detailed information about a specific town.",
        schema: z.object({
            town_name: z.string().describe("The name of the town to get details for."),
        }),
    }
);

const updateTownTool = tool(
    (input: { town_name: string; new_name?: string; new_description?: string }) => "",
    {
        name: "update_town",
        description: "Update the name or description of an existing town.",
        schema: z.object({
            town_name: z.string().describe("The current name of the town."),
            new_description: z.string().optional().describe("The new description of the town (if updating)."),
        }),
    }
);

const deleteTownTool = tool(
    (input: { town_name: string }) => "",
    {
        name: "delete_town",
        description: "Remove a town from the list of famous towns.",
        schema: z.object({
            town_name: z.string().describe("The name of the town to remove."),
        }),
    }
);

const deleteAllTownsTool = tool(
    () => "",
    {
        name: "delete_all_towns",
        description: "Remove all towns from the list.",
        schema: z.object({}),
    }
);

const chatNode = async (state: AgentState) => {
    const tools = [addTownTool, getTownDetailTool, updateTownTool, deleteTownTool, deleteAllTownsTool];
    const staticTools = llm.bindTools([...tools, ...convertActionsToDynamicStructuredTools(state.copilotkit?.actions || [])]);
    const response = await staticTools.invoke(state.messages);
  
    if (response.tool_calls?.length) {
      const toolCall = response.tool_calls[0];
  
      switch (toolCall.name) {
        case "get_agent_name":
          return new Command({
            goto: "getFeedback",
            update: { messages: [...state.messages, response] },
          });
        case "add_town":
          const { town_name: addedTownName, description = "" } = toolCall.args;
          return new Command({
            goto: "getFeedback1",
            update: {
              ...state,
              towns: { ...state.towns, [addedTownName]: description },
              messages: [...state.messages, new SystemMessage(`Town "${addedTownName}" added.`)],
            },
          });
          case "get_town_details":
          const townName = toolCall.args.town_name;
          return new Command({
            goto: "getFeedback1",
            update: {
              ...state,
              messages: [...state.messages, new SystemMessage(`Town details: ${state.towns?.[townName] || "Town not found."}`)],
            },
          });
        case "update_town":
          const { town_name: updatedTownName, new_description } = toolCall.args;
          return new Command({
            goto: "getFeedback1",
            update: {
              ...state,
              towns: { ...state.towns, [updatedTownName]: new_description },
              messages: [...state.messages, new SystemMessage(`Town "${updatedTownName}" updated.`)],
            },
          });
        case "delete_town":
          const townNameToDelete = toolCall.args.town_name;
          return new Command({
            goto: "getFeedback1",
            update: {
              ...state,
              towns: { ...state.towns, [townNameToDelete]: undefined },
              messages: [...state.messages, new SystemMessage(`Town "${townNameToDelete}" removed.`)],
            },
          });
        case "delete_all_towns":
          return new Command({
            goto: "getFeedback1",
            update: {
              ...state,
              towns: {},
              messages: [...state.messages, new SystemMessage("All towns removed.")],
            },
          });
        case "get_famous_towns":
          return new Command({
            goto: "getFeedback",
            update: { messages: [...state.messages, response] },
          });
        default:
          return new Command({
            goto: END,
            update: { messages: [...state.messages, response] },
          });
      }
    }
  
    return new Command({
      goto: END,
      update: { messages: [...state.messages, response] },
    });
  };
// Placeholder for external modifications before handling feedback
const getFeedback = async (state: AgentState) => {
    return state;
};

const operationSuccess = async (state: AgentState) => {
    return {
        ...state,
        messages: [new SystemMessage('Operation completed successfully')],
    };
};

const handleFeedback = async (state: AgentState) => {
    let newState: Partial<AgentState> = { ...state, towns: state.towns || {} };

    try {
        const userResponse = state.messages[state.messages.length - 1]?.content || "{}";
        const parsedData = JSON.parse(userResponse);

        if (parsedData.towns && Array.isArray(parsedData.towns)) {
            parsedData.towns.forEach((town: { name: string; details: string }) => {
                newState.towns![town.name] = town.details;
            });
        }

        if (parsedData.agentName && typeof parsedData.agentName === 'string') {
            newState.agentName = parsedData.agentName;
        }
    } catch (error) {
        return {
            ...newState,
            messages: [...state.messages, new SystemMessage("Failed to process town data.")],
        };
    }

    const informativeMessage =
        Object.keys(newState.towns || {}).length > 0
            ? "Ask user do you want to add more towns"
            : "Ask user do you want any other details";

    return {
        ...newState,
        messages: [...state.messages, new SystemMessage(informativeMessage)],
    };
};

// Define the graph and compile it
export const graph = new StateGraph(AgentStateAnnotation)
    .addNode("chatNode", chatNode, { ends: ["getFeedback", "operationSuccess"] })
    .addNode("getFeedback", getFeedback)
    .addNode("operationSuccess", operationSuccess)
    .addNode("handleFeedback", handleFeedback)
    .addEdge("__start__", "chatNode")
    .addEdge("getFeedback", "handleFeedback")
    .addEdge("handleFeedback", "chatNode")
    .addEdge("operationSuccess", "chatNode")
    .compile({
        checkpointer: new MemorySaver(),
        interruptAfter: ["getFeedback"],
    });