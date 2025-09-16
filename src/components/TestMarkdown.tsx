import { MarkdownRenderer } from './MarkdownRenderer';

const sampleResponse = `Com base no art. 289 do Código Penal brasileiro, apresento exemplos práticos e situações aplicáveis:

## 1. EXEMPLOS PRÁTICOS CONCRETOS

Exemplo 1: Carlos monta uma oficina clandestina onde utiliza impressoras de alta qualidade para reproduzir cédulas de R$ 100, utilizando papel especial e técnicas de impressão que simulam elementos de segurança. Ele distribui essas notas falsas em comércios locais durante a noite.

Exemplo 2: Funcionário do Banco Central, no exercício de suas funções, autoriza a impressão de 1 milhão de cédulas a mais do que a quantidade legalmente permitida, desviando-as para circulação ilegal através de intermediários.

## 2. SITUAÇÕES DO COTIDIANO

- Comerciante que identifica nota falsa mas ainda assim tenta repassá-la para outro estabelecimento como troco, após descobrir que recebeu a moeda falsa de um cliente

- Pessoa que adquire moedas falsas de R$ 1,00 para uso em máquinas de refrigerante e transporte público

- Indivíduo que guarda moeda falsa recebida sem intenção inicial de utilizá-la, mas mantém em posse sabendo da falsidade

## 3. CASOS HIPOTÉTICOS

Caso A: João recebe de um cliente uma cédula de R$ 50 falsa durante o expediente. No dia seguinte, ao pagar o estacionamento, utiliza essa mesma nota sabendo que é falsa. Enquadra-se no § 2º do artigo.

Caso B: Maria, diretora de um banco comercial, desvia lotes de novas cédulas que ainda não foram liberadas para circulação pelo Banco Central e as introduz no mercado através de cambistas. Configura o crime do § 4º.

## 4. DIFERENCIAÇÃO COM DISPOSITIVOS SIMILARES

Diferença para o crime de estelionato (art. 171):

- Moeda falsa: o bem em si é fraudulento (a moeda)

- Estelionato: o bem é verdadeiro, mas a aquisição se dá mediante fraude

Diferença para falsificação de documento público (art. 297):

- Moeda falsa: específico para instrumento monetário de curso legal

- Documento público: abrange outros documentos oficiais não monetários

Característica peculiar: O § 2º prevê situação atenuada para quem inicialmente recebeu de boa-fé, diferenciando-se da conduta dolosa inicial dos demais parágrafos.

A gravidade das penas varia conforme a posição do agente (mais severas para funcionários públicos e bancários) e a modalidade de conduta, refletindo o potencial dano à economia nacional.`;

export function TestMarkdown() {
  return (
    <div className="p-6 bg-white rounded-lg shadow max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Exemplo de Formatação da Resposta IA</h2>
      <div className="border border-gray-200 rounded-lg p-4">
        <MarkdownRenderer content={sampleResponse} />
      </div>
    </div>
  );
}