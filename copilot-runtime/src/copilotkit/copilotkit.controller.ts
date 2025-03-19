import { All, Controller, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CopilotRuntime,
  copilotRuntimeNestEndpoint,
  langGraphPlatformEndpoint,
  OpenAIAdapter,
} from '@copilotkit/runtime';
import { Request, Response } from 'express';
import OpenAI from 'openai';

@Controller()
export class CopilotkitController {
  private readonly openai: OpenAI;
  private readonly runtime: CopilotRuntime;
  private readonly llmAdapter: OpenAIAdapter;

  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY') || '',
    });

    this.llmAdapter = new OpenAIAdapter({
      openai: this.openai,
      model: 'gpt-4o-mini',
    });

    this.runtime = new CopilotRuntime({
      remoteEndpoints: [
        langGraphPlatformEndpoint({
          deploymentUrl:
            this.configService.get<string>('LANGGRAPH_DEPLOYMENT_URL', ''),
          langsmithApiKey: this.configService.get<string>('LANGSMITH_API_KEY', ''),
          agents: [
            {
              name: 'sample_agent',
              description: 'A helpful LLM agent.',
            },
          ],
        }),
      ],
    });
  }

  @All('/copilotkit')
  copilotkit(@Req() req: Request, @Res() res: Response) {
    return copilotRuntimeNestEndpoint({
      runtime: this.runtime,
      serviceAdapter: this.llmAdapter,
      endpoint: '/copilotkit',
    })(req, res);
  }
}
