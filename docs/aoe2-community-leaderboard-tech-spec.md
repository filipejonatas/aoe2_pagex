# Tech Spec — AoE2 Community Leaderboard

## 1. Visão do Produto

Criar uma plataforma web inspirada em trackers competitivos como OP.GG, porém focada inicialmente em **Age of Empires II: Definitive Edition**.

O MVP não terá torneios, partidas internas, ELO próprio ou sistema competitivo independente.

A proposta inicial é simples:

- Usuários criam uma conta.
- Vinculam seu perfil real do AoE2.
- Criam ou entram em ligas/comunidades.
- Cada liga possui um leaderboard ordenado pelo **ELO oficial/real do AoE2**.
- O sistema registra snapshots do rating ao longo do tempo.
- O usuário consegue acompanhar evolução, posição e variação de ELO dentro da comunidade.

A plataforma deve ser construída de forma modular, permitindo futuramente adicionar:

- torneios;
- partidas internas;
- ELO próprio da liga;
- temporadas;
- playoffs;
- scouting de adversários;
- análises de civilizações;
- estatísticas avançadas;
- integração com Discord;
- replay analysis.

---

# 2. Objetivo do MVP

Entregar uma plataforma funcional onde jogadores de AoE2 possam participar de rankings privados ou públicos baseados em seu rating real do jogo.

Fluxo principal:

```text
Cadastro/Login
    ↓
Vincular perfil AoE2
    ↓
Criar liga ou entrar em uma liga
    ↓
Sistema busca ELO real
    ↓
Leaderboard da liga
    ↓
Histórico de rating
```

---

# 3. Escopo do MVP

## Incluído

### Autenticação

- Cadastro de usuário.
- Login.
- Logout.
- Sessão persistente.
- Recuperação de senha pode ser adicionada posteriormente.

### Perfil AoE2

O usuário poderá:

- pesquisar seu perfil pelo nickname;
- selecionar o perfil correto;
- vincular o `profile_id` ao usuário da aplicação;
- visualizar dados atuais do AoE2.

Dados mínimos:

- nickname;
- profile_id;
- Steam ID, quando disponível;
- rating atual;
- rank global;
- maior rating conhecido;
- total de partidas;
- vitórias;
- derrotas;
- win rate.

### Ligas

Usuários autenticados poderão:

- criar uma liga;
- visualizar ligas das quais participam;
- entrar em uma liga por código/link;
- sair de uma liga;
- visualizar leaderboard.

Inicialmente, uma liga terá:

- nome;
- slug;
- descrição;
- criador;
- código de convite;
- visibilidade;
- data de criação.

### Leaderboard

Ranking ordenado por:

```text
rating oficial AoE2 DESC
```

Campos sugeridos:

| Campo | Descrição |
|---|---|
| posição | posição atual na liga |
| nickname | nome atual do jogador |
| rating | ELO oficial |
| rank global | posição global |
| peak | maior ELO registrado |
| delta 24h | variação |
| delta 7d | variação |
| delta 30d | variação |

### Histórico de Rating

O sistema deverá armazenar snapshots periódicos do jogador.

Exemplo:

```text
player_id
rating
global_rank
wins
losses
recorded_at
```

Isso permitirá gerar:

- evolução diária;
- variação em 7 dias;
- variação em 30 dias;
- peak histórico;
- mudança de posição dentro da liga.

---

# 4. Fora do Escopo do MVP

Não implementar inicialmente:

- ELO próprio da plataforma;
- desafio entre jogadores;
- submissão manual de resultados;
- torneios;
- brackets;
- playoffs;
- temporadas;
- ranking por pontos internos;
- upload de replay;
- análise de replay;
- scouting;
- estatísticas detalhadas por civilização;
- estatísticas por mapa;
- comparação head-to-head;
- chat;
- Discord bot;
- notificações;
- aplicativo mobile nativo.

Estas funcionalidades devem ser consideradas apenas na arquitetura para evitar bloqueios futuros.

---

# 5. Stack Recomendada

## Frontend

```text
React
TypeScript
Vite
React Router
Tailwind CSS
TanStack Query
```

Opcional:

```text
Recharts
```

ou

```text
Chart.js
```

para gráficos.

## Backend

```text
Node.js
TypeScript
Express
```

Alternativa futura:

```text
NestJS
```

Não é necessário para o MVP.

## Banco

```text
PostgreSQL
```

ORM:

```text
Prisma
```

## Autenticação

Opção recomendada:

```text
JWT
```

Com:

- access token;
- refresh token opcional.

Alternativas aceitáveis:

- Clerk;
- Supabase Auth;
- Firebase Auth.

Para maior controle do backend, priorizar JWT.

---

# 6. Arquitetura

```text
Browser
   │
   ▼
React Frontend
   │
   ▼
REST API
Node + Express
   │
   ├──────────► AoE2 External API
   │
   ▼
PostgreSQL
```

A aplicação nunca deve depender diretamente da API do AoE2 no frontend.

Toda integração externa deve passar pelo backend.

Motivos:

- cache;
- segurança;
- normalização;
- controle de rate limit;
- tratamento de indisponibilidade;
- possibilidade de trocar o provider da API futuramente.

---

# 7. Integração AoE2

Criar uma camada de abstração:

```text
AoEProvider
```

Exemplo:

```ts
interface AoEProvider {
  searchPlayers(query: string): Promise<PlayerSearchResult[]>;
  getPlayer(profileId: string): Promise<AoEPlayer>;
  getLeaderboardProfile(profileId: string): Promise<AoERating>;
}
```

Não espalhar chamadas HTTP específicas da API externa pelo projeto.

Implementação inicial:

```text
WorldsEdgeAoEProvider
```

Estrutura sugerida:

```text
src/
  integrations/
    aoe/
      aoe-provider.interface.ts
      worlds-edge.provider.ts
      aoe.types.ts
```

Isso permite futuramente trocar:

```text
World's Edge
↓
AoE2 Companion
↓
Outro provider
```

sem reescrever regras de negócio.

---

# 8. Modelo de Dados

## User

```text
id
email
username
password_hash
created_at
updated_at
```

## AoEPlayer

```text
id
user_id
profile_id
steam_id
nickname
current_rating
current_global_rank
peak_rating
wins
losses
games
last_synced_at
created_at
updated_at
```

Relacionamento:

```text
User 1 ─── 0..1 AoEPlayer
```

No MVP, cada usuário poderá vincular apenas um perfil AoE2.

---

## League

```text
id
name
slug
description
owner_id
invite_code
visibility
created_at
updated_at
```

Visibility:

```text
PUBLIC
PRIVATE
```

---

## LeagueMember

```text
id
league_id
player_id
joined_at
```

Constraints:

```text
UNIQUE(league_id, player_id)
```

---

## RatingSnapshot

```text
id
player_id
rating
global_rank
wins
losses
games
recorded_at
```

Índice recomendado:

```text
(player_id, recorded_at)
```

---

# 9. Schema Conceitual

```text
User
 │
 │ 1:1
 ▼
AoEPlayer
 │
 ├──────────────┐
 │              │
 ▼              ▼
LeagueMember   RatingSnapshot
 │
 ▼
League
```

---

# 10. Endpoints do MVP

Base:

```text
/api/v1
```

---

## Auth

### POST

```text
/auth/register
```

Body:

```json
{
  "email": "user@email.com",
  "username": "player",
  "password": "senha"
}
```

### POST

```text
/auth/login
```

### GET

```text
/auth/me
```

---

# 11. Players

### GET

```text
/players/search?q=nickname
```

Responsável por buscar perfis AoE2.

Resposta:

```json
[
  {
    "profileId": "123456",
    "nickname": "Player",
    "rating": 1450,
    "rank": 18000
  }
]
```

---

### POST

```text
/players/link
```

Body:

```json
{
  "profileId": "123456"
}
```

Fluxo:

1. validar usuário;
2. consultar perfil no provider;
3. verificar se profile_id já está vinculado;
4. criar AoEPlayer;
5. criar primeiro RatingSnapshot.

---

### GET

```text
/players/:profileId
```

Retorna perfil público.

---

### GET

```text
/players/:profileId/rating-history
```

Query opcional:

```text
?range=30d
```

Ranges:

```text
7d
30d
90d
all
```

---

# 12. Leagues

### POST

```text
/leagues
```

Body:

```json
{
  "name": "Liga Vale do Paraíba",
  "description": "Comunidade AoE2",
  "visibility": "PRIVATE"
}
```

---

### GET

```text
/leagues
```

Retorna ligas do usuário.

---

### GET

```text
/leagues/:slug
```

---

### POST

```text
/leagues/:leagueId/join
```

Body:

```json
{
  "inviteCode": "ABC123"
}
```

---

### DELETE

```text
/leagues/:leagueId/members/me
```

---

### GET

```text
/leagues/:slug/leaderboard
```

Resposta sugerida:

```json
{
  "league": {
    "id": "uuid",
    "name": "Liga Vale do Paraíba"
  },
  "leaderboard": [
    {
      "position": 1,
      "nickname": "Player1",
      "profileId": "123",
      "rating": 1650,
      "globalRank": 5000,
      "peakRating": 1710,
      "delta24h": 18,
      "delta7d": 62,
      "delta30d": 140
    }
  ]
}
```

---

# 13. Regra do Leaderboard

Ranking principal:

```sql
ORDER BY current_rating DESC
```

Desempate:

```text
1. maior rating
2. menor rank global
3. peak rating
4. data de entrada na liga
```

O rating exibido sempre deve ser o valor oficial mais recente obtido da API AoE2.

---

# 14. Sincronização dos Ratings

Não consultar a API externa toda vez que uma página for carregada.

Usar cache no banco.

Exemplo:

```text
current_rating
last_synced_at
```

Estratégia inicial:

```text
sync interval = 30 minutos
```

ou:

```text
60 minutos
```

O intervalo deve ser configurável por variável de ambiente.

Exemplo:

```text
AOE_SYNC_INTERVAL_MINUTES=60
```

---

# 15. Job de Sincronização

Criar serviço:

```text
RatingSyncService
```

Responsabilidades:

1. buscar jogadores que precisam atualizar;
2. consultar provider AoE2;
3. atualizar `AoEPlayer`;
4. criar `RatingSnapshot` quando houver mudança relevante.

Pseudo fluxo:

```text
for player in playersToSync
    remote = provider.getPlayer(player.profileId)

    update player.current_rating

    if rating changed:
        create RatingSnapshot
```

---

# 16. Estratégia para RatingSnapshot

Evitar duplicação excessiva.

Criar snapshot quando:

```text
rating mudou
```

OU:

```text
passaram 24h desde o último snapshot
```

Dessa forma existe histórico mesmo para jogadores inativos.

---

# 17. Métricas Derivadas

Não armazenar necessariamente:

```text
delta24h
delta7d
delta30d
```

Calcular utilizando `RatingSnapshot`.

Exemplo:

```text
ratingNow - nearestSnapshot(7 days ago)
```

---

# 18. Cache

MVP:

```text
PostgreSQL
```

é suficiente.

Futuro:

```text
Redis
```

para:

- leaderboard;
- busca;
- rate limiting;
- cache API externa.

Não adicionar Redis antes de existir necessidade real.

---

# 19. Rate Limiting

Criar proteção básica:

```text
express-rate-limit
```

Principalmente nos endpoints:

```text
/players/search
/auth/login
```

E evitar chamadas desnecessárias ao provider AoE2.

---

# 20. Tratamento de Erros da API AoE2

A aplicação deve continuar funcional se o provider estiver indisponível.

Exemplo:

```text
AoE API DOWN
```

Comportamento:

- retornar dados cacheados;
- informar `lastSyncedAt`;
- não remover jogador;
- não zerar rating.

Nunca substituir rating conhecido por:

```text
0
null
```

por falha temporária da API.

---

# 21. Segurança

## Password

Utilizar:

```text
bcrypt
```

ou:

```text
argon2
```

Nunca armazenar senha em texto puro.

---

## JWT

Payload mínimo:

```json
{
  "sub": "user-id"
}
```

Não colocar:

```text
password
rating
steam credentials
```

---

## Validação

Usar:

```text
Zod
```

ou:

```text
Joi
```

Recomendado:

```text
Zod
```

---

# 22. Regras Importantes

### Um perfil AoE2 não pode pertencer a dois usuários.

Constraint:

```text
AoEPlayer.profile_id UNIQUE
```

### Um usuário não pode entrar duas vezes na mesma liga.

Constraint:

```text
UNIQUE(league_id, player_id)
```

### Apenas owner pode alterar configuração da liga.

### Owner pode remover membros.

### Usuário pode sair voluntariamente da liga.

---

# 23. Páginas do Frontend

## Home

Objetivos:

- explicar rapidamente o produto;
- pesquisar jogador;
- login/signup;
- CTA para criar ou entrar em liga.

---

## Login

```text
/login
```

---

## Register

```text
/register
```

---

## Onboarding AoE

```text
/onboarding/aoe
```

Fluxo:

```text
Digite seu nickname
↓
Resultados
↓
Selecione seu perfil
↓
Confirme
```

---

## Dashboard

```text
/dashboard
```

Mostrar:

- perfil AoE2;
- rating;
- variação;
- ligas;
- posição em cada liga.

---

## Player Profile

```text
/player/:profileId
```

Componentes:

```text
PlayerHeader
RatingCard
RatingChart
RecentTrend
LeagueMemberships
```

---

## League

```text
/league/:slug
```

Componentes:

```text
LeagueHeader
Leaderboard
LeaderboardFilters
MemberCount
InviteButton
```

---

# 24. Componentes Frontend

Estrutura inicial:

```text
src/
  components/
    layout/
    leaderboard/
    player/
    league/
    charts/
    ui/

  pages/
    Home/
    Login/
    Register/
    Dashboard/
    Player/
    League/

  services/
    api.ts

  hooks/

  types/
```

---

# 25. Estado e Fetching

Evitar armazenar dados do servidor globalmente manualmente.

Usar:

```text
TanStack Query
```

para:

- leaderboard;
- perfil;
- histórico;
- ligas;
- search.

Exemplo:

```text
useQuery({
  queryKey: ['league', slug, 'leaderboard']
})
```

---

# 26. UI/UX — A DEFINIR

Esta seção será refinada após análise visual de referências.

Sites que podem ser avaliados:

```text
OP.GG
AoE2 Insights
AoE2 Companion
AoE2.GG
AoE Battles
```

Avaliar:

### Home

- hierarquia;
- search;
- CTA;
- navegação.

### Player Profile

- card de rating;
- gráfico;
- histórico;
- indicadores de variação;
- densidade da informação.

### Leaderboard

- tabela;
- posição;
- avatar;
- badges;
- highlighting;
- responsividade.

### League Page

- cabeçalho;
- identificação;
- quantidade de jogadores;
- filtros;
- convite.

### Visual

Definir posteriormente:

```text
tipografia
cores
spacing
radius
shadow
icons
dark/light mode
```

### Regra

Não copiar identidade visual de terceiros.

Usar referências apenas para:

- arquitetura de informação;
- padrões de interação;
- hierarquia visual;
- densidade;
- navegabilidade.

---

# 27. Responsividade

Prioridade:

```text
Desktop
↓
Tablet
↓
Mobile
```

Leaderboard no mobile pode ocultar campos secundários.

Exemplo:

Desktop:

```text
# | Player | ELO | Rank | Peak | 7d | 30d
```

Mobile:

```text
# | Player | ELO | 7d
```

---

# 28. Observabilidade

MVP:

```text
console logging estruturado
```

Futuro:

```text
Sentry
```

---

# 29. Testes

## Backend

Utilizar:

```text
Vitest
```

ou:

```text
Jest
```

Testar prioritariamente:

- cálculo de leaderboard;
- vínculo de player;
- duplicidade de perfil;
- join league;
- autorização;
- cálculo de deltas;
- sync de rating.

---

## Frontend

Testes mínimos.

Utilizar:

```text
Vitest
React Testing Library
```

Prioridade:

- leaderboard rendering;
- estados loading/error;
- busca;
- onboarding.

---

# 30. Estrutura Backend

Sugestão:

```text
src/
  modules/
    auth/
      auth.controller.ts
      auth.service.ts
      auth.routes.ts
      auth.schema.ts

    players/
      player.controller.ts
      player.service.ts
      player.repository.ts
      player.routes.ts

    leagues/
      league.controller.ts
      league.service.ts
      league.repository.ts
      league.routes.ts

    ratings/
      rating.service.ts
      rating.repository.ts

  integrations/
    aoe/
      aoe-provider.interface.ts
      worlds-edge.provider.ts

  jobs/
    rating-sync.job.ts

  middleware/
    auth.middleware.ts
    error.middleware.ts
    rate-limit.middleware.ts

  lib/
    prisma.ts

  config/

  app.ts
  server.ts
```

---

# 31. Prisma — Estrutura Inicial

Exemplo conceitual:

```prisma
model User {
  id           String      @id @default(uuid())
  email        String      @unique
  username     String      @unique
  passwordHash String

  aoePlayer    AoEPlayer?
  ownedLeagues League[]

  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
}

model AoEPlayer {
  id                String   @id @default(uuid())
  userId            String   @unique
  profileId         String   @unique
  steamId           String?
  nickname          String

  currentRating     Int?
  currentGlobalRank Int?
  peakRating        Int?

  wins              Int?
  losses            Int?
  games             Int?

  lastSyncedAt      DateTime?

  user              User             @relation(fields: [userId], references: [id])
  leagueMemberships LeagueMember[]
  ratingSnapshots   RatingSnapshot[]

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model League {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  description String?
  ownerId     String
  inviteCode  String   @unique
  visibility  LeagueVisibility

  owner       User           @relation(fields: [ownerId], references: [id])
  members     LeagueMember[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model LeagueMember {
  id       String @id @default(uuid())
  leagueId String
  playerId String

  league League    @relation(fields: [leagueId], references: [id])
  player AoEPlayer @relation(fields: [playerId], references: [id])

  joinedAt DateTime @default(now())

  @@unique([leagueId, playerId])
}

model RatingSnapshot {
  id         String @id @default(uuid())
  playerId   String

  rating     Int?
  globalRank Int?
  wins       Int?
  losses     Int?
  games      Int?

  player     AoEPlayer @relation(fields: [playerId], references: [id])

  recordedAt DateTime @default(now())

  @@index([playerId, recordedAt])
}

enum LeagueVisibility {
  PUBLIC
  PRIVATE
}
```

---

# 32. Variáveis de Ambiente

```env
DATABASE_URL=

JWT_SECRET=
JWT_EXPIRES_IN=

AOE_API_BASE_URL=
AOE_SYNC_INTERVAL_MINUTES=60

FRONTEND_URL=
PORT=
```

---

# 33. Deploy

Sugestão inicial:

## Frontend

```text
Vercel
```

## Backend

```text
Railway
```

ou:

```text
Render
```

## Database

```text
PostgreSQL Railway
```

ou:

```text
Neon
```

---

# 34. Etapas de Desenvolvimento

## Fase 1 — Foundation

- configurar monorepo ou projetos separados;
- PostgreSQL;
- Prisma;
- Express;
- React;
- autenticação.

## Fase 2 — AoE Integration

- criar provider;
- player search;
- profile lookup;
- player linking.

## Fase 3 — League

- criação de liga;
- código de convite;
- membership;
- leaderboard.

## Fase 4 — Rating History

- snapshots;
- sync job;
- delta 7d;
- delta 30d;
- gráfico.

## Fase 5 — UX

- dashboard;
- player page;
- league page;
- loading states;
- empty states;
- mobile.

## Fase 6 — Polish

- testes;
- rate limiting;
- error handling;
- deploy.

---

# 35. Critérios de Aceite do MVP

O MVP pode ser considerado funcional quando:

- usuário consegue criar conta;
- usuário consegue fazer login;
- usuário consegue pesquisar jogador AoE2;
- usuário consegue vincular um perfil;
- não é possível duplicar profile_id;
- usuário consegue criar liga;
- outro usuário consegue entrar por convite;
- leaderboard ordena jogadores pelo rating real;
- rating é atualizado automaticamente;
- aplicação armazena histórico;
- perfil mostra evolução de rating;
- leaderboard mostra variação recente;
- falha na API AoE não quebra a aplicação;
- aplicação funciona em desktop e mobile.

---

# 36. Princípios do Projeto

## 1. Fonte de verdade

O rating oficial do AoE2 é a fonte de verdade do ranking.

## 2. Sem manipulação manual

Usuário não poderá editar seu rating.

## 3. API externa desacoplada

Integração AoE deve ser substituível.

## 4. Histórico próprio

A plataforma deve armazenar snapshots para construir inteligência ao longo do tempo.

## 5. MVP simples

Não implementar sistema competitivo próprio antes de validar interesse dos usuários.

## 6. Evolução incremental

Arquitetura deve permitir:

```text
Leaderboard
↓
Communities
↓
Seasons
↓
Matches
↓
Tournaments
↓
Competitive Platform
```

sem exigir reescrita completa.

---

# 37. Backlog Pós-MVP

Prioridade a definir após validação.

Possibilidades:

```text
player comparison
head-to-head
country rankings
league activity feed
achievements
ELO milestones
Discord integration
notifications
public player profile
player badges
season snapshots
automatic records
civ statistics
map statistics
match history
replay analysis
opponent scouting
tournaments
league ELO
```

---

# 38. Questões Abertas

Estas decisões devem ser revisadas antes da implementação final:

1. Qual leaderboard oficial será usado como padrão?
   - 1v1 Random Map?
   - outro?

2. A plataforma permitirá múltiplos perfis AoE por usuário no futuro?

3. Ligas públicas poderão ser abertas sem convite?

4. Owner poderá aprovar entrada manualmente?

5. Frequência ideal de sincronização?

6. O provider atual permite consultar todos os campos necessários com estabilidade?

7. Como será feita a confirmação de propriedade do perfil?

8. Haverá avatar?
   - AoE;
   - Steam;
   - customizado.

9. Username da plataforma será diferente do nickname AoE?

10. Histórico começará somente após cadastro ou será importado quando possível?

---

# 39. UI/UX Reference Notes

Preencher posteriormente.

## OP.GG

### Manter

```text
TODO
```

### Evitar

```text
TODO
```

---

## AoE2 Insights

### Manter

```text
TODO
```

### Evitar

```text
TODO
```

---

## AoE2 Companion

### Manter

```text
TODO
```

### Evitar

```text
TODO
```

---

## Outras Referências

```text
TODO
```

---

# 40. Definição Atual do Produto

> Uma plataforma de comunidades e ligas de Age of Empires II onde jogadores vinculam seus perfis oficiais e competem socialmente em leaderboards baseados exclusivamente no rating real do AoE2.

O foco inicial não é substituir o matchmaking do AoE2.

O foco é transformar o ranking oficial em uma experiência social, comparável e organizada por comunidades.
