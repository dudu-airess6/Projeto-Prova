const CHAVE_ARMAZENAMENTO = 'supermart_estoque_pt_v1';

const PRODUTOS_INICIAIS = [
  { id: 1, nome: 'Arroz Branco Tipo 1 — 5 kg', quantidade: 42, preco: 28.90, precoAlterado: false },
  { id: 2, nome: 'Feijão Carioca — 1 kg', quantidade: 18, preco: 8.49, precoAlterado: false },
  { id: 3, nome: 'Leite Integral UHT — 1 L', quantidade: 0, preco: 5.79, precoAlterado: false }
];

let produtos = carregarProdutos();
let filtroAtual = 'todos';
let termoBusca = '';
let idEmEdicao = null;
let idParaExcluir = null;

function buscarElemento(id) {
  return document.getElementById(id);
}

function carregarProdutos() {
  try {
    const dadosSalvos = localStorage.getItem(CHAVE_ARMAZENAMENTO);

    if (dadosSalvos) {
      const lista = JSON.parse(dadosSalvos);

      if (Array.isArray(lista)) {
        return lista.map(function (item) {
          return {
            id: Number(item.id),
            nome: String(item.nome || item.name || ''),
            quantidade: Math.max(0, Math.floor(Number(item.quantidade ?? item.quantity ?? 0))),
            preco: Number(item.preco ?? item.price ?? 0),
            precoAlterado: Boolean(item.precoAlterado ?? item.priceChanged)
          };
        });
      }
    }
  } catch (erro) {
    /* Ignora falha de leitura e usa os produtos iniciais */
  }

  return [...PRODUTOS_INICIAIS];
}

function salvarProdutos() {
  try {
    localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(produtos));
  } catch (erro) {
    /* Ignora falha caso o navegador bloqueie armazenamento local */
  }
}

function formatarMoeda(valor) {
  const numero = Number(valor || 0);
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function escaparHtml(texto) {
  const div = document.createElement('div');
  div.textContent = String(texto);
  return div.innerHTML;
}

function mostrarAviso(mensagem, tipo = 'sucesso') {
  const caixa = buscarElemento('caixa-aviso');
  const texto = buscarElemento('texto-aviso');

  caixa.className = `aviso visivel ${tipo}`;
  texto.textContent = mensagem;
}

function fecharAviso() {
  buscarElemento('caixa-aviso').className = 'aviso';
}

function salvarERenderizar(mensagem, tipo) {
  salvarProdutos();
  renderizarTabela();

  if (mensagem) {
    mostrarAviso(mensagem, tipo);
  }
}

function gerarSeloStatus(quantidade) {
  if (quantidade === 0) {
    return '<span class="selo selo-ruptura">Em Ruptura</span>';
  }

  if (quantidade <= 4) {
    return '<span class="selo selo-baixo">Estoque Baixo</span>';
  }

  return '<span class="selo selo-ok">Em Estoque</span>';
}

function atualizarIndicadores() {
  let totalUnidades = 0;
  let totalEmEstoque = 0;

  for (const item of produtos) {
    totalUnidades += item.quantidade;
    if (item.quantidade > 0) {
      totalEmEstoque++;
    }
  }

  const totalRuptura = produtos.length - totalEmEstoque;

  buscarElemento('kpi-total-unidades').textContent = totalUnidades.toLocaleString('pt-BR');
  buscarElemento('kpi-texto-unidades').textContent = `Soma total em ${produtos.length} ${produtos.length === 1 ? 'produto' : 'produtos'}`;

  buscarElemento('kpi-total-ruptura').textContent = totalRuptura.toLocaleString('pt-BR');
  buscarElemento('kpi-cartao-ruptura').classList.toggle('zerado', totalRuptura === 0);

  if (totalRuptura === 0) {
    buscarElemento('kpi-texto-ruptura').textContent = 'Todas as prateleiras abastecidas';
  } else {
    buscarElemento('kpi-texto-ruptura').textContent = `${totalRuptura} ${totalRuptura === 1 ? 'produto com' : 'produtos com'} estoque zerado`;
  }

  buscarElemento('contagem-todos').textContent = produtos.length;
  buscarElemento('contagem-em-estoque').textContent = totalEmEstoque;
  buscarElemento('contagem-ruptura').textContent = totalRuptura;
}

function obterProdutosFiltrados() {
  const busca = termoBusca.trim().toLowerCase();

  return produtos.filter(function (produto) {
    const combinaNome = produto.nome.toLowerCase().includes(busca);
    if (!combinaNome) {
      return false;
    }

    if (filtroAtual === 'em_estoque') {
      return produto.quantidade > 0;
    }

    if (filtroAtual === 'ruptura') {
      return produto.quantidade === 0;
    }

    return true;
  });
}

function renderizarTabela() {
  atualizarIndicadores();

  const filtros = ['todos', 'em_estoque', 'ruptura'];
  for (const chave of filtros) {
    buscarElemento(`filtro-${chave}`).classList.toggle('ativo', chave === filtroAtual);
  }

  const listaFiltrada = obterProdutosFiltrados();

  if (listaFiltrada.length === produtos.length) {
    buscarElemento('resumo-tabela').textContent = `Exibindo ${produtos.length} ${produtos.length === 1 ? 'item' : 'itens'} no estoque.`;
  } else {
    buscarElemento('resumo-tabela').textContent = `Exibindo ${listaFiltrada.length} de ${produtos.length} itens cadastrados.`;
  }

  const semResultados = listaFiltrada.length === 0;
  buscarElemento('container-tabela').hidden = semResultados;
  buscarElemento('estado-vazio').hidden = !semResultados;

  if (semResultados) {
    const estoqueVazio = produtos.length === 0;
    buscarElemento('titulo-vazio').textContent = estoqueVazio ? 'Estoque vazio' : 'Nenhum produto encontrado';
    buscarElemento('descricao-vazio').textContent = estoqueVazio
      ? 'Cadastre o primeiro item no formulário acima.'
      : 'Nenhum item corresponde à busca ou ao filtro selecionado.';
    buscarElemento('botao-vazio').textContent = estoqueVazio ? 'Cadastrar primeiro produto' : 'Limpar busca e filtros';
    return;
  }

  const linhasHtml = listaFiltrada.map(function (produto) {
    if (idEmEdicao === produto.id) {
      return `
        <tr class="em-edicao">
          <td data-label="Produto">
            <input class="campo campo-edicao" id="editar-nome-${produto.id}" data-id="${produto.id}" value="${escaparHtml(produto.nome)}" maxlength="80">
          </td>
          <td data-label="Quantidade">
            <input class="campo campo-edicao campo-numero" id="editar-quantidade-${produto.id}" data-id="${produto.id}" type="number" min="0" step="1" value="${produto.quantidade}">
          </td>
          <td data-label="Preço Unitário">
            <input class="campo campo-edicao campo-numero" id="editar-preco-${produto.id}" data-id="${produto.id}" type="number" min="0.01" step="0.01" value="${produto.preco.toFixed(2)}">
          </td>
          <td data-label="Status">${gerarSeloStatus(produto.quantidade)}</td>
          <td data-label="Ações">
            <div class="acoes">
              <button class="botao botao-verde botao-pequeno" type="button" data-acao="salvar" data-id="${produto.id}">Salvar</button>
              <button class="botao botao-contorno botao-pequeno" type="button" data-acao="cancelar" data-id="${produto.id}">Cancelar</button>
            </div>
          </td>
        </tr>
      `;
    }

    let botoesAcao = '';
    if (idParaExcluir === produto.id) {
      botoesAcao = `
        <button class="botao botao-vermelho botao-pequeno" type="button" data-acao="confirmar-exclusao" data-id="${produto.id}">Confirmar</button>
        <button class="botao botao-contorno botao-pequeno" type="button" data-acao="cancelar" data-id="${produto.id}">Cancelar</button>
      `;
    } else {
      botoesAcao = `
        <button class="botao botao-contorno botao-pequeno" type="button" data-acao="editar" data-id="${produto.id}">Editar</button>
        <button class="botao botao-perigo botao-pequeno" type="button" data-acao="preparar-exclusao" data-id="${produto.id}">Excluir</button>
      `;
    }

    const etiquetaPreco = produto.precoAlterado
      ? '<span class="etiqueta-preco">Preço alterado</span>'
      : '';

    const desabilitarMenos = produto.quantidade === 0 ? 'disabled' : '';

    return `
      <tr>
        <td data-label="Produto">
          <div class="celula-produto">
            <span class="nome-produto">${escaparHtml(produto.nome)}</span>
            ${etiquetaPreco}
          </div>
        </td>
        <td data-label="Quantidade">
          <div class="controle-qtd">
            <button class="botao-qtd" type="button" data-acao="diminuir" data-id="${produto.id}" ${desabilitarMenos} aria-label="Diminuir">−</button>
            <span class="tabular valor-qtd">${produto.quantidade}</span>
            <button class="botao-qtd" type="button" data-acao="aumentar" data-id="${produto.id}" aria-label="Aumentar">+</button>
          </div>
        </td>
        <td data-label="Preço Unitário">
          <span class="tabular">${formatarMoeda(produto.preco)}</span>
        </td>
        <td data-label="Status">${gerarSeloStatus(produto.quantidade)}</td>
        <td data-label="Ações">
          <div class="acoes">${botoesAcao}</div>
        </td>
      </tr>
    `;
  });

  buscarElemento('corpo-tabela').innerHTML = linhasHtml.join('');
}

function marcarCampoInvalido(campo, mensagem) {
  campo.classList.add('invalido');
  campo.focus();
  mostrarAviso(mensagem, 'erro');
}

function cadastrarProduto(evento) {
  evento.preventDefault();

  const campoNome = buscarElemento('campo-nome');
  const campoQuantidade = buscarElemento('campo-quantidade');
  const campoPreco = buscarElemento('campo-preco');

  campoNome.classList.remove('invalido');
  campoQuantidade.classList.remove('invalido');
  campoPreco.classList.remove('invalido');

  const nome = campoNome.value.trim();
  const quantidade = Number(campoQuantidade.value);
  const preco = Number(campoPreco.value.replace(',', '.'));

  if (!nome) {
    marcarCampoInvalido(campoNome, 'Informe o nome do produto.');
    return;
  }

  if (campoQuantidade.value.trim() === '' || !Number.isInteger(quantidade) || quantidade < 0) {
    marcarCampoInvalido(campoQuantidade, 'Informe uma quantidade inteira (0 ou mais).');
    return;
  }

  if (!preco || preco <= 0) {
    marcarCampoInvalido(campoPreco, 'Informe um preço maior que R$ 0,00.');
    return;
  }

  let maiorId = 0;
  for (const item of produtos) {
    if (item.id > maiorId) {
      maiorId = item.id;
    }
  }

  const novoProduto = {
    id: maiorId + 1,
    nome: nome,
    quantidade: quantidade,
    preco: Math.round(preco * 100) / 100,
    precoAlterado: false
  };

  produtos.unshift(novoProduto);
  evento.target.reset();
  idEmEdicao = null;
  idParaExcluir = null;

  if (quantidade === 0) {
    salvarERenderizar('Produto cadastrado com estoque zerado (em ruptura).', 'alerta');
  } else {
    salvarERenderizar(`Produto cadastrado! "${nome}" entrou com ${quantidade} un.`, 'sucesso');
  }
}

function ajustarQuantidade(id, variacao) {
  const produto = produtos.find(function (item) {
    return item.id === id;
  });

  if (!produto) {
    return;
  }

  produto.quantidade = Math.max(0, produto.quantidade + variacao);
  idParaExcluir = null;

  if (produto.quantidade === 0) {
    salvarERenderizar(`Atenção: "${produto.nome}" entrou em ruptura.`, 'alerta');
  } else if (produto.quantidade <= 4) {
    const palavraUnidade = produto.quantidade === 1 ? 'unidade' : 'unidades';
    salvarERenderizar(`Restam ${produto.quantidade} ${palavraUnidade} de "${produto.nome}".`, 'alerta');
  } else {
    salvarERenderizar(`Estoque de "${produto.nome}" atualizado para ${produto.quantidade} un.`, 'sucesso');
  }
}

function iniciarEdicao(id) {
  idEmEdicao = id;
  idParaExcluir = null;
  renderizarTabela();

  const campo = buscarElemento(`editar-nome-${id}`);
  if (campo) {
    campo.focus();
  }
}

function salvarEdicao(id) {
  const produto = produtos.find(function (item) {
    return item.id === id;
  });

  if (!produto) {
    return;
  }

  const campoNome = buscarElemento(`editar-nome-${id}`);
  const campoQuantidade = buscarElemento(`editar-quantidade-${id}`);
  const campoPreco = buscarElemento(`editar-preco-${id}`);

  const nome = campoNome.value.trim();
  const quantidadeTexto = campoQuantidade.value.trim();
  const quantidade = Number(quantidadeTexto);
  const preco = Number(campoPreco.value.replace(',', '.'));

  if (!nome || quantidadeTexto === '' || !Number.isInteger(quantidade) || quantidade < 0 || !preco || preco <= 0) {
    mostrarAviso('Verifique os dados informados antes de salvar.', 'erro');
    return;
  }

  const novoPreco = Math.round(preco * 100) / 100;

  if (novoPreco !== produto.preco) {
    produto.precoAlterado = true;
  }

  produto.nome = nome;
  produto.quantidade = quantidade;
  produto.preco = novoPreco;
  idEmEdicao = null;

  salvarERenderizar(`Atualizado! "${nome}" — ${formatarMoeda(novoPreco)} (${quantidade} un.).`, 'sucesso');
}

function prepararExclusao(id) {
  idParaExcluir = id;
  idEmEdicao = null;
  renderizarTabela();
}

function confirmarExclusao(id) {
  const produto = produtos.find(function (item) {
    return item.id === id;
  });

  produtos = produtos.filter(function (item) {
    return item.id !== id;
  });

  idParaExcluir = null;

  if (produto) {
    salvarERenderizar(`Item "${produto.nome}" removido do cadastro.`, 'sucesso');
  } else {
    salvarERenderizar();
  }
}

function cancelarAcoes() {
  idEmEdicao = null;
  idParaExcluir = null;
  renderizarTabela();
}

function buscarProduto(valor) {
  termoBusca = valor;
  buscarElemento('botao-limpar-busca').classList.toggle('visivel', valor.length > 0);
  renderizarTabela();
}

function limparBusca() {
  const campo = buscarElemento('campo-busca');
  campo.value = '';
  campo.focus();
  buscarProduto('');
}

function definirFiltro(novoFiltro) {
  filtroAtual = novoFiltro;
  cancelarAcoes();
}

function acaoEstadoVazio() {
  if (produtos.length === 0) {
    buscarElemento('campo-nome').focus();
  } else {
    filtroAtual = 'todos';
    limparBusca();
  }
}

function configurarEventos() {
  buscarElemento('formulario-produto').addEventListener('submit', cadastrarProduto);
  buscarElemento('botao-fechar-aviso').addEventListener('click', fecharAviso);
  buscarElemento('botao-limpar-busca').addEventListener('click', limparBusca);
  buscarElemento('botao-vazio').addEventListener('click', acaoEstadoVazio);

  buscarElemento('campo-busca').addEventListener('input', function (evento) {
    buscarProduto(evento.target.value);
  });

  buscarElemento('grupo-filtros').addEventListener('click', function (evento) {
    const botao = evento.target.closest('[data-filtro]');
    if (botao) {
      definirFiltro(botao.dataset.filtro);
    }
  });

  buscarElemento('corpo-tabela').addEventListener('click', function (evento) {
    const botao = evento.target.closest('[data-acao]');
    if (!botao) {
      return;
    }

    const id = Number(botao.dataset.id);
    const acao = botao.dataset.acao;

    if (acao === 'diminuir') {
      ajustarQuantidade(id, -1);
    } else if (acao === 'aumentar') {
      ajustarQuantidade(id, 1);
    } else if (acao === 'editar') {
      iniciarEdicao(id);
    } else if (acao === 'salvar') {
      salvarEdicao(id);
    } else if (acao === 'preparar-exclusao') {
      prepararExclusao(id);
    } else if (acao === 'confirmar-exclusao') {
      confirmarExclusao(id);
    } else if (acao === 'cancelar') {
      cancelarAcoes();
    }
  });

  buscarElemento('corpo-tabela').addEventListener('keydown', function (evento) {
    const campo = evento.target.closest('[data-id]');
    if (!campo) {
      return;
    }

    if (evento.key === 'Enter') {
      evento.preventDefault();
      salvarEdicao(Number(campo.dataset.id));
    } else if (evento.key === 'Escape') {
      cancelarAcoes();
    }
  });
}

configurarEventos();
renderizarTabela();