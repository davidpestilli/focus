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

  // Função para limpar frases introdutórias e de despedida da IA
  private cleanAIResponse(content: string): string {
    // Padrões de frases introdutórias comuns
    const introPatterns = [
      /^Claro!\s*/i,
      /^Certamente!\s*/i,
      /^Vamos analisar[\s\S]*?\./i,
      /^Perfeito!\s*/i,
      /^Excelente pergunta!\s*/i,
      /^Vou explicar[\s\S]*?\./i,
      /^Com prazer[\s\S]*?\./i,
      /^Ótima pergunta[\s\S]*?\./i
    ];

    // Padrões de frases de despedida comuns
    const outroPatterns = [
      /Espero que[\s\S]*?[!.]\s*$/i,
      /Boa sorte[\s\S]*?[!.]\s*$/i,
      /Estude bem[\s\S]*?[!.]\s*$/i,
      /Qualquer dúvida[\s\S]*?[!.]\s*$/i,
      /Se precisar[\s\S]*?[!.]\s*$/i,
      /Bons estudos[\s\S]*?[!.]\s*$/i,
      /😊[\s\S]*$/,
      /👍[\s\S]*$/,
      /🙂[\s\S]*$/
    ];

    let cleanedContent = content.trim();

    // Remover marcadores de código (```json, ```, etc.)
    cleanedContent = cleanedContent.replace(/```json\s*/gi, '');
    cleanedContent = cleanedContent.replace(/```\s*/g, '');
    cleanedContent = cleanedContent.replace(/`{1,3}/g, '');

    // Remover frases introdutórias
    for (const pattern of introPatterns) {
      cleanedContent = cleanedContent.replace(pattern, '');
    }

    // Remover frases de despedida
    for (const pattern of outroPatterns) {
      cleanedContent = cleanedContent.replace(pattern, '');
    }

    // Limpar múltiplas quebras de linha consecutivas
    cleanedContent = cleanedContent.replace(/\n\s*\n\s*\n/g, '\n\n');

    // Remover espaços extras no início e fim
    return cleanedContent.trim();
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

    const response = await this.chat([systemMessage, userMessage]);
    return this.cleanAIResponse(response);
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

    const response = await this.chat([systemMessage, userMessage]);
    return this.cleanAIResponse(response);
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

    const response = await this.chat([systemMessage, userMessage]);
    return this.cleanAIResponse(response);
  }

  // Método específico para gerar questões por tipo
  async generateQuestionsByType(lawContent: string, lawTitle: string, questionType: string): Promise<string> {
    const systemMessage: DeepSeekMessage = {
      role: 'system',
      content: `Você é um especialista em elaboração de questões para concursos públicos e exames de direito. Crie questões no estilo de concursos brasileiros (CESPE, FCC, FGV, etc.).`
    };

    let typeInstructions = '';

    switch (questionType) {
      case 'multiple_choice':
        typeInstructions = `
Por favor, crie 6 questões de múltipla escolha com as seguintes características:
- Cada questão deve ter 5 alternativas (A, B, C, D, E)
- Apenas uma alternativa correta
- Alternativas plausíveis e bem elaboradas
- Nível de dificuldade variado (2 fáceis, 2 médias, 2 difíceis)
- Formate as questões de forma clara e inclua as respostas corretas com explicações`;
        break;

      case 'true_false':
        typeInstructions = `
Por favor, crie 6 questões de verdadeiro ou falso com as seguintes características:
- Afirmações claras e objetivas
- Justificativas detalhadas para cada resposta
- Nível de dificuldade variado (2 fáceis, 2 médias, 2 difíceis)
- Evite pegadinhas óbvias, mas teste conhecimento específico
- Formate as questões de forma clara e inclua as respostas corretas com explicações`;
        break;

      case 'essay':
        typeInstructions = `
Por favor, crie 6 questões dissertativas com as seguintes características:
- Questões que exijam reflexão e análise
- Respostas esperadas detalhadas (mínimo 100 palavras cada)
- Nível de dificuldade variado (2 fáceis, 2 médias, 2 difíceis)
- Questões que permitam demonstrar conhecimento prático e teórico
- Formate as questões de forma clara e inclua as respostas esperadas completas`;
        break;

      default:
        typeInstructions = `
Por favor, crie:
1. 3 questões de múltipla escolha (A, B, C, D, E)
2. 2 questões de verdadeiro ou falso com justificativa
3. 1 questão dissertativa curta

Formate as questões de forma clara e inclua as respostas corretas com explicações.`;
    }

    const userMessage: DeepSeekMessage = {
      role: 'user',
      content: `Com base no seguinte dispositivo legal, elabore questões de concurso:

**${lawTitle}**

${lawContent}

${typeInstructions}`
    };

    const response = await this.chat([systemMessage, userMessage]);
    return this.cleanAIResponse(response);
  }

  // Método para estruturar uma questão individual em JSON
  async structureSingleQuestion(questionText: string, lawTitle: string, questionIndex?: number): Promise<any> {
    const systemMessage: DeepSeekMessage = {
      role: 'system',
      content: `Você é um especialista em processamento de questões para concursos públicos.

      IMPORTANTE: Sua resposta DEVE ser exclusivamente um objeto JSON válido, sem texto adicional antes ou depois.
      Não inclua explicações, comentários ou formatação markdown - apenas o JSON puro.`
    };

    const userMessage: DeepSeekMessage = {
      role: 'user',
      content: `Converta a seguinte questão em formato JSON estruturado:

${questionText}

Contexto: ${lawTitle}

Retorne EXCLUSIVAMENTE um objeto JSON com esta estrutura:

Para questões de múltipla escolha:
{
  "type": "multiple_choice",
  "question_text": "Texto da questão",
  "options": {
    "a": "Opção A",
    "b": "Opção B",
    "c": "Opção C",
    "d": "Opção D",
    "e": "Opção E"
  },
  "correct_answer": "c",
  "explanation": "Explicação da resposta correta"
}

Para questões verdadeiro/falso:
{
  "type": "true_false",
  "question_text": "Texto da afirmação para julgar",
  "correct_answer": "true",
  "explanation": "Justificativa da resposta"
}

Para questões dissertativas:
{
  "type": "essay",
  "question_text": "Texto da questão dissertativa",
  "correct_answer": "Resposta esperada detalhada",
  "explanation": "Questão dissertativa - resposta livre"
}

RESPONDA APENAS COM O JSON - SEM TEXTO ADICIONAL.`
    };

    const response = await this.chat([systemMessage, userMessage]);

    try {
      // Tentar limpar a resposta caso venha com formatação markdown
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```\s*/, '').replace(/\s*```$/, '');
      }

      const parsedResponse = JSON.parse(cleanResponse);

      // Se a resposta é um array, pegar o elemento específico baseado no índice
      // Se é um objeto, usar diretamente
      let question;
      if (Array.isArray(parsedResponse)) {
        // Se foi fornecido um índice e é válido, usar esse índice
        const index = typeof questionIndex === 'number' && questionIndex >= 0 && questionIndex < parsedResponse.length
          ? questionIndex
          : 0; // fallback para o primeiro elemento
        question = parsedResponse[index];
      } else {
        question = parsedResponse;
      }

      if (!question || !question.type || !question.question_text) {
        throw new Error('Objeto JSON inválido - faltam campos obrigatórios');
      }

      return question;
    } catch (error) {
      console.error('Erro ao processar JSON do DeepSeek:', error);
      console.error('Resposta recebida:', response);
      throw new Error('Erro ao processar questão estruturada do DeepSeek');
    }
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

    const response = await this.chat([systemMessage, userMessage]);
    return this.cleanAIResponse(response);
  }

  // Método específico para gerar título para resumos
  async generateSummaryTitle(content: string, type: 'explanation' | 'examples' | 'custom'): Promise<string> {
    const typeDescriptions = {
      'explanation': 'explicação didática sobre o dispositivo legal',
      'examples': 'exemplos práticos de aplicação da lei',
      'custom': 'resposta a pergunta personalizada sobre a lei'
    };

    const systemMessage: DeepSeekMessage = {
      role: 'system',
      content: `Você é um especialista em criar títulos concisos e informativos para conteúdo jurídico.

      Crie um título de no máximo 60 caracteres que seja:
      - Descritivo e específico
      - Profissional e claro
      - Que capture a essência do conteúdo
      - Sem usar aspas ou caracteres especiais

      Responda APENAS com o título, sem texto adicional.`
    };

    const userMessage: DeepSeekMessage = {
      role: 'user',
      content: `Crie um título conciso para esta ${typeDescriptions[type]}:

${content.substring(0, 500)}${content.length > 500 ? '...' : ''}

Título:`
    };

    try {
      const response = await this.chat([systemMessage, userMessage]);
      // Limpar e truncar o título se necessário
      return response.trim().replace(/['"]/g, '').substring(0, 60);
    } catch (error) {
      console.error('Erro ao gerar título:', error);
      // Fallback: usar primeiras palavras do conteúdo
      const fallbackTitle = content.substring(0, 50).trim();
      const lastSpace = fallbackTitle.lastIndexOf(' ');
      return lastSpace > 0 ? fallbackTitle.substring(0, lastSpace) + '...' : fallbackTitle;
    }
  }

  // Método específico para gerar exercícios complete
  async generateCompleteExercises(lawContent: string, lawTitle: string, exerciseType: string): Promise<string> {
    const systemMessage: DeepSeekMessage = {
      role: 'system',
      content: `Você é um elaborador de questões para concursos públicos, especializado em Direito. Sua tarefa é criar exercícios de "complete a lacuna" utilizando a letra exata da lei. O objetivo é treinar o estudante a memorizar a sonoridade do texto legal e identificar pegadinhas comuns em provas.

### Regras e Diretrizes:

1. **Base normativa**
   * Sempre utilize a redação exata da lei (sem interpretações ou doutrina).
   * Informe a fonte legal no final de cada exercício (ex.: *CF/88, art. 5º, inciso XI*).

2. **Formato dos exercícios**
   * Cada exercício deve ser apresentado como enunciado com lacuna(s) para preenchimento.
   * Após o enunciado, forneça as opções de resposta (quando couber).
   * Ao final, indique o gabarito correto.

3. **Técnicas disponíveis:**
   * **(T1) Complete direto com lacuna simples:** Omitir uma palavra-chave e pedir que o estudante a complete.
   * **(T2) Complete com alternativas semelhantes (pegadinhas):** Criar lacuna e oferecer 4 alternativas muito parecidas (sinônimos próximos).
   * **(T3) Complete invertido (palavra trocada):** Apresentar o texto quase correto, mas com uma palavra errada. O estudante deve substituir pela correta.
   * **(T4) Complete por blocos:** Omitir uma expressão inteira, não apenas uma palavra.
   * **(T5) Complete misto (múltiplas lacunas + alternativas):** Deixar duas ou mais lacunas e fornecer alternativas em pares.

4. **Estilo esperado:**
   * Linguagem objetiva, como em questões de concurso.
   * Nada de explicações doutrinárias ou comentários longos: apenas enunciado, opções (quando houver) e gabarito.
5. **IMPORTANTE - Evitar exercícios inadequados:**
   * NÃO criar exercícios que foquem apenas na pena/sanção (ex.: "Pena - _____, de dois meses a um ano").
   * Priorizar elementos substantivos do tipo penal (condutas, objetos, sujeitos, circunstâncias).
   * Exercícios sobre penas são pouco didáticos para memorização da lei.`
    };

    let userContent = '';

    if (exerciseType === 'system_default') {
      userContent = `Use o seguinte texto legal de "${lawTitle}" e produza 5 exercícios de 'complete a lacuna':
- 1 exercício T1 (lacuna simples)
- 1 exercício T2 (alternativas semelhantes)
- 1 exercício T3 (palavra trocada)
- 1 exercício T4 (por blocos)
- 1 exercício T5 (múltiplas lacunas)

TEXTO LEGAL:
${lawContent}

Formate cada exercício claramente numerado (Exercício 1, Exercício 2, etc.) e indique o tipo usado.`;
    } else {
      const typeDescriptions: Record<string, string> = {
        'T1': 'T1 (lacuna simples) - omitindo palavras-chave',
        'T2': 'T2 (alternativas semelhantes) - com 4 alternativas muito parecidas',
        'T3': 'T3 (palavra trocada) - com palavra errada para substituir',
        'T4': 'T4 (por blocos) - omitindo expressões inteiras',
        'T5': 'T5 (múltiplas lacunas) - com duas ou mais lacunas'
      };

      userContent = `Use o seguinte texto legal de "${lawTitle}" e produza 3 exercícios de 'complete a lacuna' do tipo ${typeDescriptions[exerciseType] || exerciseType}.

TEXTO LEGAL:
${lawContent}

Formate cada exercício claramente numerado (Exercício 1, Exercício 2, Exercício 3).`;
    }

    const userMessage: DeepSeekMessage = {
      role: 'user',
      content: userContent
    };

    const response = await this.chat([systemMessage, userMessage]);
    return this.cleanAIResponse(response);
  }

  // Método para estruturar um exercício complete individual
  async structureSingleCompleteExercise(exerciseText: string, lawTitle: string, exerciseIndex: number): Promise<any> {
    const systemMessage: DeepSeekMessage = {
      role: 'system',
      content: `Você é um especialista em estruturação de exercícios "complete a lacuna" para banco de dados. Sua tarefa é extrair as informações de um exercício e formatá-lo em JSON estruturado.

Retorne APENAS um JSON válido com esta estrutura exata:
{
  "type": "T1|T2|T3|T4|T5",
  "exercise_text": "texto do exercício com lacunas",
  "options": {
    "a": "opção A",
    "b": "opção B",
    "c": "opção C",
    "d": "opção D"
  },
  "correct_answer": "letra da resposta correta ou texto da resposta",
  "explanation": "breve explicação da resposta"
}

REGRAS:
- Para T1, T3, T4: se não houver alternativas no texto original, crie 4 opções plausíveis (incluindo a correta)
- Para T2, T5: use as alternativas fornecidas no texto original
- O campo "type" deve ser T1, T2, T3, T4 ou T5 baseado nas características do exercício
- Se não conseguir determinar o tipo, use "T1" como padrão`
    };

    const userMessage: DeepSeekMessage = {
      role: 'user',
      content: `Estruture este exercício complete para o banco de dados:

EXERCÍCIO:
${exerciseText}

CONTEXTO: Lei "${lawTitle}", Exercício ${exerciseIndex + 1}`
    };

    const response = await this.chat([systemMessage, userMessage]);

    try {
      return JSON.parse(this.cleanAIResponse(response));
    } catch (error) {
      console.error('Erro ao fazer parse do exercício estruturado:', error);
      // Fallback com estrutura básica
      return {
        type: 'T1',
        exercise_text: exerciseText,
        options: {
          a: 'Opção A',
          b: 'Opção B',
          c: 'Opção C',
          d: 'Opção D'
        },
        correct_answer: 'a',
        explanation: 'Exercício extraído automaticamente'
      };
    }
  }
}

// Instância singleton
export const deepseekService = new DeepSeekService();

export { DeepSeekService };
export type { DeepSeekMessage, DeepSeekResponse };