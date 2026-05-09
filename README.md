# radardou-js

SDK oficial JavaScript/TypeScript para a API do [Radar DOU](https://www.radar-dou.com) — Sistema de Monitoramento do Diário Oficial da União.

## Requisitos

- Node.js >= 18 (para `fetch` nativo) — ou navegador moderno
- API Key válida de assinante (gere em [www.radar-dou.com/api-keys](https://www.radar-dou.com/api-keys))

## Instalação

```bash
npm install github:Wandrys-dev/radardou-js
```

> **Nome do pacote ≠ nome do repositório.** O repositório se chama `radardou-js`, mas o nome do pacote declarado em `package.json` é **`@radardou/sdk`**. Isso significa que após o `npm install ...` o pacote fica em `node_modules/@radardou/sdk/` e os `import`s devem usar `'@radardou/sdk'` (ver exemplos abaixo).

## Início rápido

```typescript
import { RadarDOU } from '@radardou/sdk';

const client = new RadarDOU({ apiKey: process.env.RADAR_API_KEY! });

// IMPORTANTE: pelo menos um filtro é obrigatório
const resultado = await client.buscar({
  dateFrom: '2026-05-01',
  limit: 10,
});

console.log(`Total: ${resultado.pagination.total}`);
resultado.data.forEach(p => console.log(`[${p.secao_codigo}] ${p.titulo}`));

await client.close();
```

## Buscar publicações

```typescript
// Por data
await client.buscar({ dateFrom: '2026-05-01', dateTo: '2026-05-08' });

// Por palavra-chave
await client.buscar({ query: 'licitação', dateFrom: '2026-05-01' });

// Filtros combinados
await client.buscar({
  query: 'edital',
  secao: 'DO3',         // DO1, DO2, DO3 ou Extra
  tipo: 'Edital',       // Portaria, Edital, Despacho, etc.
  dateFrom: '2026-01-01',
  dateTo: '2026-05-08',
  page: 1,
  limit: 50,            // máx 100
});
```

**Filtro mínimo obrigatório.** Chamar `buscar({})` sem nenhum filtro lança `APIError("FILTER_REQUIRED")`.
Isso evita scans amplos da tabela de publicações (~7M+ linhas).

## Detalhes de uma publicação

A listagem retorna apenas `texto_resumo`. Para o **texto completo**:

```typescript
const ids = resultado.data.map(p => p.id);
for (const id of ids) {
  const pub = await client.obterPublicacao(id);
  console.log(pub.titulo);
  console.log(pub.texto_puro);    // texto completo
  console.log(pub.texto_html);    // HTML completo
}
```

## Alertas

```typescript
// Listar
const { data: alertas } = await client.listarAlertas();

// Criar
const alerta = await client.criarAlerta({
  name: 'Concursos TI',
  searchCriteria: { query: 'desenvolvedor', secao: 'DO3' },
  frequency: 'daily',          // realtime | hourly | daily | weekly
  emailNotification: true,
});
```

## Favoritos e coleções

```typescript
await client.listarFavoritos();
await client.adicionarFavorito('12345');
await client.removerFavorito('12345');

await client.listarColecoes();
await client.criarColecao('Editais 2026');
```

## Vocabulário

```typescript
const vocab = await client.vocabulario();  // seções e tipos disponíveis
```

## Tratamento de erros

```typescript
import {
  RadarDOU,
  AuthenticationError,
  SessionConflictError,
  RateLimitError,
  APIError,
} from '@radardou/sdk';

try {
  const client = new RadarDOU({ apiKey: process.env.RADAR_API_KEY! });
  const resultado = await client.buscar({ dateFrom: '2026-05-01' });
} catch (e) {
  if (e instanceof AuthenticationError) console.error('Chave inválida');
  else if (e instanceof SessionConflictError) console.error(`Outra sessão ativa em ${e.activeIp}`);
  else if (e instanceof RateLimitError) console.error(`Rate limit. Reset em ${e.resetAt}`);
  else if (e instanceof APIError) console.error(`HTTP ${e.statusCode}: ${e.message}`);
}
```

## Limites por plano

| Plano | Rate limit | Sessões | Chaves |
|-------|-----------|---------|--------|
| Trial (5 dias) | 100 req/h | 1 | 1 |
| Profissional | 1.000 req/h | 1 | 2 |
| Premium | 5.000 req/h | 3 | 5 |
| Empresarial | 10.000 req/h | 10 | 10 |

## Licença

MIT
