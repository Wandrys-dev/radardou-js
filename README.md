# @radardou/sdk

SDK oficial JavaScript/TypeScript para a API do [Radar DOU](https://radar-dou.com) - Sistema de Monitoramento do Diário Oficial da União.

## Requisitos

- Node.js 16+
- API Key válida de assinante do Radar DOU

## Instalação

```bash
npm install @radardou/sdk
# ou
yarn add @radardou/sdk
# ou
pnpm add @radardou/sdk
```

## Início Rápido

```typescript
import { RadarDOU } from '@radardou/sdk';

// Inicialize o cliente com sua API Key
const client = new RadarDOU({ apiKey: 'sua_api_key_aqui' });

// Buscar publicações
const resultado = await client.buscar({ termo: 'licitação' });
console.log(`Encontrados ${resultado.total} resultados`);

// Ao finalizar, encerre a sessão
await client.close();
```

## Funcionalidades

### Busca de Publicações

```typescript
// Busca simples
const resultado = await client.buscar({ termo: 'edital' });

// Busca com filtros
const resultado = await client.buscar({
  termo: 'pregão eletrônico',
  dataInicio: '2024-01-01',
  dataFim: '2024-12-31',
  orgao: 'Ministério da Educação',
  tipo: 'edital',
  secao: 3,
  pagina: 1,
  limite: 50
});

// Obter publicação específica
const publicacao = await client.obterPublicacao('abc123');
```

### Gerenciamento de Alertas

```typescript
// Listar alertas
const { alertas } = await client.listarAlertas();

// Criar alerta
const alerta = await client.criarAlerta({
  nome: 'Monitorar Licitações Saúde',
  termos: ['licitação', 'pregão'],
  orgaos: ['Ministério da Saúde'],
  emailNotificacao: true
});

// Atualizar alerta
await client.atualizarAlerta(alerta.id, { nome: 'Novo Nome' });

// Excluir alerta
await client.excluirAlerta(alerta.id);
```

### Informações de Uso

```typescript
// Ver uso da API
const uso = await client.obterUso();
console.log(`Requisições hoje: ${uso.requisicoes_hoje}`);
console.log(`Limite por hora: ${uso.limite_hora}`);

// Informações da conta
const conta = await client.obterConta();
console.log(`Plano: ${conta.plano}`);
```

## Controle de Sessão

O SDK implementa controle automático de sessão para garantir que sua API Key seja usada apenas por você:

- **Fingerprint de dispositivo**: Identifica unicamente seu computador
- **Heartbeat automático**: Mantém sua sessão ativa
- **Detecção de uso compartilhado**: Impede que outros usem sua API Key simultaneamente

### Comportamento de Sessão

Quando você inicializa o cliente, uma sessão é automaticamente criada. Se outro dispositivo tentar usar a mesma API Key, receberá um erro `SessionConflictError`.

```typescript
import { RadarDOU, SessionConflictError } from '@radardou/sdk';

try {
  const client = new RadarDOU({ apiKey: 'sua_api_key' });
} catch (error) {
  if (error instanceof SessionConflictError) {
    console.log(`Erro: ${error.message}`);
    console.log(`IP ativo: ${error.activeIp}`);
  }
}
```

## Tratamento de Erros

```typescript
import {
  RadarDOU,
  AuthenticationError,
  SessionConflictError,
  RateLimitError,
  APIError
} from '@radardou/sdk';

try {
  const client = new RadarDOU({ apiKey: 'sua_api_key' });
  const resultado = await client.buscar({ termo: 'teste' });
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.log(`Erro de autenticação: ${error.message}`);
    // API Key inválida ou expirada
  } else if (error instanceof SessionConflictError) {
    console.log(`Conflito de sessão: ${error.message}`);
    console.log(`Outro IP está usando: ${error.activeIp}`);
  } else if (error instanceof RateLimitError) {
    console.log(`Limite atingido: ${error.message}`);
    console.log(`Limite: ${error.limit}`);
    console.log(`Reset em: ${error.resetAt}`);
  } else if (error instanceof APIError) {
    console.log(`Erro da API: ${error.message}`);
    console.log(`Status: ${error.statusCode}`);
  }
}
```

## TypeScript

O SDK inclui tipos TypeScript completos:

```typescript
import type {
  RadarDOUConfig,
  SearchParams,
  SearchResult,
  Publication,
  Alert
} from '@radardou/sdk';

const config: RadarDOUConfig = {
  apiKey: 'sua_api_key',
  timeout: 60000
};

const params: SearchParams = {
  termo: 'licitação',
  secao: 3
};
```

## Limites por Plano

| Plano | Requisições/hora | Sessões Simultâneas |
|-------|------------------|---------------------|
| Profissional | 1.000 | 1 |
| Premium | 5.000 | 3 |
| Enterprise | Ilimitado | Ilimitado |

## Obtenha sua API Key

Para usar este SDK, você precisa de uma API Key válida:

1. Acesse [radar-dou.com](https://radar-dou.com)
2. Crie uma conta ou faça login
3. Assine um plano
4. Gere sua API Key em [Configurações > API Keys](https://radar-dou.com/api-keys)

## Suporte

- 📧 Email: suporte@radar-dou.com
- 📖 Documentação: [radar-dou.com/docs](https://radar-dou.com/docs)
- 🐛 Issues: [GitHub Issues](https://github.com/radar-dou/radardou-js/issues)

## Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.
