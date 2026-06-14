# Configuração do bolão

## Resultados oficiais

O projeto usa a API pública `worldcup26.ir/get/games` no job
`.github/workflows/sync-results.yml`. Ela não exige token. A execução ocorre a
cada 20 minutos e também pode ser iniciada manualmente no GitHub Actions.

Crie este secret no repositório:

- `FIREBASE_SERVICE_ACCOUNT_JSON`: JSON completo de uma conta de serviço do
  projeto Firebase.

Depois de configurar os secrets, execute o workflow manualmente uma vez para
popular a coleção `matches`. Antes dessa primeira sincronização, os botões de
confirmação permanecem bloqueados porque o horário oficial ainda não existe no
Firestore.

Também é possível fazer a primeira carga localmente:

```powershell
$env:FIREBASE_SERVICE_ACCOUNT_JSON = Get-Content .\service-account.json -Raw
npm run sync:results
```

Não publique nem faça commit do arquivo `service-account.json`.

## Firebase

Publique as regras e o site com:

```powershell
firebase deploy --only firestore:rules,hosting
```

O Firestore usa estas coleções:

- `users`: perfil básico dos participantes.
- `matches`: horários e resultados oficiais, gravados pelo job.
- `predictions`: palpites confirmados, privados por usuário.
- `rankings`: ranking geral, somente leitura no navegador.

## Ajustar um palpite passado

Use a ferramenta administrativa somente quando houver uma justificativa válida
para registrar ou corrigir um palpite após o prazo. O ajuste fica marcado no
documento com data e justificativa, e o ranking é recalculado automaticamente.

Listar usuários:

```powershell
npm run admin:prediction -- list-users --service-account "C:\caminho\service-account.json"
```

Listar partidas encerradas e seus identificadores:

```powershell
npm run admin:prediction -- list-matches --service-account "C:\caminho\service-account.json"
```

Registrar ou corrigir um palpite:

```powershell
npm run admin:prediction -- set --service-account "C:\caminho\service-account.json" --email "usuario@email.com" --match A-0 --score 2x1 --reason "Palpite informado antes da partida"
```

Essa ferramenta usa o Firebase Admin e não deve ser exposta na interface web.
