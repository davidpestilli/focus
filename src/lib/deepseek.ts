interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class DeepSeekService {
  private apiKey: string;
  private baseURL = 'https://api.deepseek.com/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || import.meta.env.VITE_DEEPSEEK_API_KEY || '';

    if (!this.apiKey) {
      console.warn('DeepSeek API key não encontrada. Configure VITE_DEEPSEEK_API_KEY no arquivo .env');
    }
  }

  async chat(messages: DeepSeekMessage[]): Promise<string> {
    if (!this.apiKey) {
      throw new Error('API key do DeepSeek não configurada. Configure VITE_DEEPSEEK_API_KEY no arquivo .env');
    }

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages,
          max_tokens: 4000,
          temperature: 0.7,
          stream: false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
      }

      const data: DeepSeekResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('Resposta inválida da DeepSeek API');
      }

      return data.choices[0].message.content;
    } catch (error) {
      console.error('Erro na chamada da DeepSeek API:', error);
      throw error;
    }
  }

  // Método específico para explicar trechos de lei
  async explainLawText(lawContent: string, lawTitle: string): Promise<string> {
    const systemMessage: DeepSeekMessage = {
      role: 'system',
      content: `Você é um assistente especializado em direito brasileiro. Sua função é explicar artigos e dispositivos legais de forma clara e didática para estudantes de direito.

Instruções:
- Forneça explicações claras e objetivas
- Use linguagem acessível mas técnica quando necessário
- Destaque os pontos principais e conceitos importantes
- Inclua exemplos práticos quando possível
- Mantenha foco no aspecto educacional`
    };

    const userMessage: DeepSeekMessage = {
      role: 'user',
      content: `Por favor, explique o seguinte dispositivo legal de forma didática:

**${lawTitle}**

${lawContent}

Forneça uma explicação clara sobre:
1. O que significa este dispositivo
2. Quais são seus elementos principais
3. Como se aplica na prática
4. Pontos importantes para memorização`
    };

    return await this.chat([systemMessage, userMessage]);
  }

  // Método específico para dar exemplos práticos
  async providePracticalExamples(lawContent: string, lawTitle: string): Promise<string> {
    const systemMessage: DeepSeekMessage = {
      role: 'system',
      content: `Você é um professor de direito especializado em casos práticos. Sua função é criar exemplos reais e situações concretas que ilustrem a aplicação de dispositivos legais.`
    };

    const userMessage: DeepSeekMessage = {
      role: 'user',
      content: `Com base no seguinte dispositivo legal, forneça exemplos práticos de aplicação:

**${lawTitle}**

${lawContent}

Por favor, forneça:
1. 2-3 exemplos práticos concretos
2. Situações do cotidiano onde este dispositivo se aplica
3. Casos hipotéticos para melhor compreensão
4. Diferenças com dispositivos similares, se houver`
    };

    return await this.chat([systemMessage, userMessage]);
  }

  // Método específico para gerar questões
  async generateQuestions(lawContent: string, lawTitle: string): Promise<string> {
    const systemMessage: DeepSeekMessage = {
      role: 'system',
      content: `Você é um especialista em elaboração de questões para concursos públicos e exames de direito. Crie questões no estilo de concursos brasileiros (CESPE, FCC, FGV, etc.).`
    };

    const userMessage: DeepSeekMessage = {
      role: 'user',
      content: `Com base no seguinte dispositivo legal, elabore questões de concurso:

**${lawTitle}**

${lawContent}

Por favor, crie:
1. 3 questões de múltipla escolha (A, B, C, D, E)
2. 2 questões de verdadeiro ou falso com justificativa
3. 1 questão dissertativa curta

Formate as questões de forma clara e inclua as respostas corretas com explicações.`
    };

    return await this.chat([systemMessage, userMessage]);
  }

  // Método para questão personalizada
  async askCustomQuestion(lawContent: string, lawTitle: string, question: string): Promise<string> {
    const systemMessage: DeepSeekMessage = {
      role: 'system',
      content: `Você é um consultor jurídico especializado em direito brasileiro. Responda às perguntas do usuário com base no contexto legal fornecido.`
    };

    const userMessage: DeepSeekMessage = {
      role: 'user',
      content: `Contexto legal:

**${lawTitle}**

${lawContent}

Pergunta do usuário: ${question}

Responda de forma clara e fundamentada no contexto fornecido.`
    };

    return await this.chat([systemMessage, userMessage]);
  }
}

// Instância singleton
export const deepseekService = new DeepSeekService();

export { DeepSeekService };
export type { DeepSeekMessage, DeepSeekResponse };