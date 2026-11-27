# Capas das campanhas — 27/11/2026

O usuário aprovou substituir o ícone genérico das campanhas de vídeo por uma
imagem do vídeo e, após confirmar a apresentação, autorizou incluir a mudança
na preparação do beta. Isso não autoriza convidar usuários nem enviar à Apple.

## Alteração

- Quadro estático extraído pelo componente nativo já instalado; sem autoplay.
- Fonte protegida resolvida pela autorização existente; sem cache persistente.
- Capa limitada a 640 pixels e mantida apenas na sessão atual. Renovar o link
  autorizado não recarrega uma capa válida. Sair da conta ou perder acesso a oculta.
- Falhas mantêm o cartão navegável com indicador de vídeo.
- Título com contraste escurecido e indicador de reprodução fora do texto.
- Nenhuma alteração de API, banco, campanhas ou regras de consentimento.

## Validação

Suíte completa: 608 testes aprovados em 96 suítes. A rodada focada também
passou nos 19 testes de Business, mídia privada e novas capas.
Checagem de tipos e lint sem erros ou avisos nos arquivos alterados.

Na primeira execução nativa, o SDK aceitou um número na tipagem, mas o iOS
exigiu uma lista de instantes; corrigido para `[time]` e coberto por teste.
Em inicialização limpa no iPhone 17 Pro simulado, a campanha Adidas de teste
mostrou o quadro real com título legível e sem iniciar a reprodução.
O usuário também confirmou que a apresentação estava funcionando.

A validação visual usa a empresa antiga do ambiente isolado, por isso a
captura contém “Demo”. As dez marcas publicadas no ambiente do beta mantêm
os nomes aprovados sem esse sufixo. Não confundir os dois ambientes.

## Entrega

Branch de implementação: `codex/campaign-video-covers-20261127`, criada a
partir de `codex/prepare-beta-release-20261127`. Integrar somente na preparação
do beta, mantendo main inalterada. O pacote iOS anterior não contém as capas;
é necessário um novo build antes de disponibilizar essa interface aos testadores.
