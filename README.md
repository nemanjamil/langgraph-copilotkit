# Coagent Langgraph Project Setup

This project is a full-stack application built with LangGraph, NestJS, and Next.js. It consists of three main components:
- **Agent**: A LangGraph-based AI agent.
- **Copilot Runtime**: A NestJS backend that serves as a proxy for the LangGraph agent.
- **UI**: A Next.js frontend for interacting with the system.

Follow the steps below to set up and run the project.

---

## Prerequisites
Ensure you are in the `coagent-langgraph/` directory before proceeding.

---

## 1. Running the Agent

### Install Dependencies
```sh
cd agent-ts
npm install
```

### Configure Environment Variables

- Navigate to the `src` directory

- Open `agent.ts` file and update the `apiKey` variable
---

### Start the Agent
Navigate back to `agent-ts` folder

Run the following command to host the agent locally using docker.
```sh
npx @langchain/langgraph-cli up
```

---

## 2. Running the Copilot Runtime

### Install Dependencies
```sh
cd ./copilot-runtime
npm install
```


### Configuring Environment Variables  

- Copy the `.env.example` file to create a new `.env` file
   
- Update the required keys in the `.env` file.  

- Export the `OPENAI_API_KEY` in your terminal:  
   ```sh
   export OPENAI_API_KEY=sk-proj-****
   ```  

### Start the Copilot Runtime
Start the copilot runtime in development mode:
```sh
npm run start:dev
```

The copilot runtime acts as a proxy for your LangGraph agent.

---

## 3. Running the UI

### Install Dependencies
```sh
cd ./ui
npm install
```

### Start the UI
Run the development server:
```sh
npm run dev
```

---

## 4. Access the Application
Open your browser and navigate to [http://localhost:3000](http://localhost:3000) to access the application.

---

## 5. Access LangGraph Studio
Open your browser and navigate to this [url](https://smith.langchain.com/studio?baseUrl=http://localhost:8123) to access LangGraph studio.

---

## Notes
- Ensure all services are running concurrently for proper functionality.
- Confirm that environment variables are correctly set for the agent.
- Check port configurations to avoid conflicts.