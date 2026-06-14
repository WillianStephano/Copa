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
