// =======================================
// app.js
// Parte 1
// Variáveis e Inicialização
// =======================================

let fretes = [];

// Foto atualmente selecionada no formulário
let fotoSelecionada = { dataUrl: "", largura: null, altura: null };

// id do frete em edição (null = criando um novo)
let editandoId = null;

// chaves das semanas atualmente expandidas na tela "Fretes Cadastrados"
let semanasAbertas = new Set();

document.addEventListener("DOMContentLoaded", iniciar);

async function iniciar(){

    await iniciarBanco();

    fretes = await carregarBanco();

    atualizarResumo();
    renderizarFretes();

    document.getElementById("fotoCamera")
        .addEventListener("change", function(){
            if(this.files && this.files[0]){
                processarImagem(this.files[0]);
            }
        });

    document.getElementById("fotoGaleria")
        .addEventListener("change", function(){
            if(this.files && this.files[0]){
                processarImagem(this.files[0]);
            }
        });

    document.getElementById("btnNovo")
        .addEventListener("click", salvarFrete);

    document.getElementById("btnCancelarEdicao")
        .addEventListener("click", cancelarEdicao);

    document.getElementById("btnAbrirFretes")
        .addEventListener("click", abrirTelaFretes);

    document.getElementById("btnVoltarFretes")
        .addEventListener("click", fecharTelaFretes);

    document.getElementById("fecharModal")
        .addEventListener("click", fecharFoto);

    document.getElementById("modalFoto")
        .addEventListener("click", function(e){
            if(e.target.id === "modalFoto"){
                fecharFoto();
            }
        });
}

// =======================================
// Processar foto (corrige rotação e guarda proporção real)
// =======================================
//
// Fotos de celular guardam a orientação em um metadado (EXIF).
// O navegador mostra a foto em pé normalmente, mas o jsPDF ignora
// esse metadado e desenha os pixels "crus" -> por isso saía girada.
// createImageBitmap com imageOrientation:"from-image" já aplica
// essa correção antes de a gente desenhar num canvas, resolvendo
// o problema tanto na prévia quanto no PDF.

async function processarImagem(arquivo){

    try{

        const bitmap = await createImageBitmap(
            arquivo,
            { imageOrientation: "from-image" }
        );

        const maxDim = 1280;
        let w = bitmap.width;
        let h = bitmap.height;

        if(w > maxDim || h > maxDim){
            const escala = maxDim / Math.max(w, h);
            w = Math.round(w * escala);
            h = Math.round(h * escala);
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(bitmap, 0, 0, w, h);

        fotoSelecionada = {
            dataUrl: canvas.toDataURL("image/jpeg", 0.85),
            largura: w,
            altura: h
        };

    }catch(erro){

        // Fallback para navegadores sem suporte a createImageBitmap
        fotoSelecionada = await processarImagemFallback(arquivo);
    }

    const preview = document.getElementById("previewFoto");
    preview.src = fotoSelecionada.dataUrl;
    preview.style.display = "block";
}

function processarImagemFallback(arquivo){

    return new Promise((resolve)=>{

        const leitor = new FileReader();

        leitor.onload = function(e){

            const img = new Image();

            img.onload = function(){
                resolve({
                    dataUrl: e.target.result,
                    largura: img.naturalWidth,
                    altura: img.naturalHeight
                });
            };

            img.src = e.target.result;
        };

        leitor.readAsDataURL(arquivo);
    });
}

// =======================================
// Salvar (cria novo OU atualiza existente)
// =======================================

async function salvarFrete(){

    const os = document.getElementById("os").value.trim();
    const solicitante = document.getElementById("solicitante").value.trim();
    const responsavel = document.getElementById("responsavel").value.trim();
    const descricao = document.getElementById("descricao").value.trim();
    const valor = document.getElementById("valor").value;
    const obs = document.getElementById("obs").value.trim();

    if(!os || !solicitante || !responsavel || !descricao || !valor){
        alert("Preencha todos os campos obrigatórios (O.S., Solicitante, Responsável, Serviço e Valor).");
        return;
    }

    if(editandoId){

        const frete = fretes.find(f => f.id === editandoId);

        frete.os = os;
        frete.solicitante = solicitante;
        frete.responsavel = responsavel;
        frete.descricao = descricao;
        frete.valor = valor;
        frete.obs = obs;
        frete.foto = fotoSelecionada.dataUrl;
        frete.fotoLargura = fotoSelecionada.largura;
        frete.fotoAltura = fotoSelecionada.altura;

        await salvarFreteBanco(frete);

    }else{

        const frete = {
            id: Date.now(),
            os: os,
            solicitante: solicitante,
            responsavel: responsavel,
            descricao: descricao,
            valor: valor,
            obs: obs,
            foto: fotoSelecionada.dataUrl,
            fotoLargura: fotoSelecionada.largura,
            fotoAltura: fotoSelecionada.altura,
            data: new Date().toLocaleDateString("pt-BR")
        };

        await salvarFreteBanco(frete);

        fretes.push(frete);
    }

    cancelarEdicao();
    atualizarResumo();
    renderizarFretes();
}

// =======================================
// Editar
// =======================================

function editarFrete(id){

    fecharTelaFretes();

    const frete = fretes.find(f => f.id === id);
    if(!frete) return;

    document.getElementById("os").value = frete.os;
    document.getElementById("solicitante").value = frete.solicitante;
    document.getElementById("responsavel").value = frete.responsavel;
    document.getElementById("descricao").value = frete.descricao;
    document.getElementById("valor").value = frete.valor;
    document.getElementById("obs").value = frete.obs;

    const preview = document.getElementById("previewFoto");

    if(frete.foto){
        preview.src = frete.foto;
        preview.style.display = "block";
    }else{
        preview.src = "";
        preview.style.display = "none";
    }

    fotoSelecionada = {
        dataUrl: frete.foto || "",
        largura: frete.fotoLargura || null,
        altura: frete.fotoAltura || null
    };

    editandoId = frete.id;

    document.getElementById("tituloForm").textContent = "Editar Frete";
    document.getElementById("btnNovo").textContent = "🔄 Atualizar Frete";
    document.getElementById("btnCancelarEdicao").style.display = "block";

    document.querySelector(".novo").scrollIntoView({ behavior: "smooth" });
}

function cancelarEdicao(){

    editandoId = null;
    fotoSelecionada = { dataUrl: "", largura: null, altura: null };

    document.getElementById("os").value = "";
    document.getElementById("solicitante").value = "";
    document.getElementById("responsavel").value = "";
    document.getElementById("descricao").value = "";
    document.getElementById("valor").value = "";
    document.getElementById("obs").value = "";
    document.getElementById("fotoCamera").value = "";
    document.getElementById("fotoGaleria").value = "";

    const preview = document.getElementById("previewFoto");
    preview.src = "";
    preview.style.display = "none";

    document.getElementById("tituloForm").textContent = "Novo Frete";
    document.getElementById("btnNovo").textContent = "💾 Salvar Frete";
    document.getElementById("btnCancelarEdicao").style.display = "none";
}

// =======================================
// Atualizar resumo (topo da tela)
// =======================================

function atualizarResumo(){

    let total = 0;

    fretes.forEach(f=>{
        total += Number(f.valor);
    });

    document.getElementById("totalSemana").textContent =
        formatarMoeda(total);

    document.getElementById("totalFretes").textContent =
        fretes.length;
}

// =======================================
// app.js
// Parte 2
// =======================================

// =======================================
// Tela "Fretes Cadastrados"
// =======================================

function abrirTelaFretes(){

    renderizarFretes();
    document.getElementById("telaFretes").style.display = "block";
}

function fecharTelaFretes(){

    document.getElementById("telaFretes").style.display = "none";
}

// =======================================
// Agrupar fretes por semana (segunda a domingo)
// =======================================

function parseDataBR(dataBR){

    const partes = dataBR.split("/");
    const dia = Number(partes[0]);
    const mes = Number(partes[1]);
    const ano = Number(partes[2]);

    return new Date(ano, mes - 1, dia);
}

function obterSegundaFeira(data){

    const d = new Date(data);
    const diaSemana = d.getDay(); // 0=domingo ... 6=sábado
    const diferenca = (diaSemana === 0) ? -6 : (1 - diaSemana);

    d.setDate(d.getDate() + diferenca);
    d.setHours(0,0,0,0);

    return d;
}

function formatarDataCurta(data){

    const dia = String(data.getDate()).padStart(2, "0");
    const mes = String(data.getMonth() + 1).padStart(2, "0");

    return dia + "/" + mes;
}

function agruparPorSemana(lista){

    const grupos = {};

    lista.forEach(frete=>{

        const data = parseDataBR(frete.data);
        const segunda = obterSegundaFeira(data);
        const chave = segunda.getFullYear() + "-" + (segunda.getMonth() + 1) + "-" + segunda.getDate();

        if(!grupos[chave]){

            const domingo = new Date(segunda);
            domingo.setDate(domingo.getDate() + 6);

            grupos[chave] = {
                chave: chave,
                inicio: segunda,
                fim: domingo,
                label: "Semana " + formatarDataCurta(segunda) + " a " + formatarDataCurta(domingo),
                fretes: []
            };
        }

        grupos[chave].fretes.push(frete);
    });

    return Object.values(grupos).sort((a, b) => b.inicio - a.inicio);
}

// =======================================
// Renderização
// =======================================

function renderizarFretes(){

    const container = document.getElementById("listaSemanas");

    container.innerHTML = "";

    if(fretes.length === 0){

        container.innerHTML = `

            <div class="vazio">

                Nenhum frete cadastrado.

            </div>

        `;

        return;
    }

    const grupos = agruparPorSemana(fretes);

    grupos.forEach(grupo=>{

        let totalSemana = 0;
        grupo.fretes.forEach(f => { totalSemana += Number(f.valor); });

        const aberta = semanasAbertas.has(grupo.chave);

        const secao = document.createElement("div");
        secao.className = "semanaCard";

        secao.innerHTML = `

            <div class="semanaHeader" onclick="toggleSemana('${grupo.chave}')">

                <div>

                    <h3>${grupo.label}</h3>

                    <span>${grupo.fretes.length} frete(s) · ${formatarMoeda(totalSemana)}</span>

                </div>

                <span class="semanaSeta">${aberta ? "▲" : "▼"}</span>

            </div>

            <div class="semanaBody" style="display:${aberta ? "block" : "none"}">

                <div class="botoesSemana">

                    <button

                        class="btnPdfSemana"

                        onclick="event.stopPropagation(); gerarPDFSemana('${grupo.chave}')"

                    >

                        📄 PDF da Semana

                    </button>

                    <button

                        class="btnExcelSemana"

                        onclick="event.stopPropagation(); gerarExcelSemana('${grupo.chave}')"

                    >

                        📊 Excel da Semana

                    </button>

                </div>

                <div class="semanaFretes"></div>

            </div>

        `;

        const listaFretesSemana = secao.querySelector(".semanaFretes");

        grupo.fretes
            .slice()
            .sort((a, b) => b.id - a.id)
            .forEach(frete=>{
                listaFretesSemana.appendChild(criarCardFrete(frete));
            });

        container.appendChild(secao);
    });
}

function toggleSemana(chave){

    if(semanasAbertas.has(chave)){
        semanasAbertas.delete(chave);
    }else{
        semanasAbertas.add(chave);
    }

    renderizarFretes();
}

function criarCardFrete(frete){

    const card = document.createElement("div");

    card.className = "card";

    card.innerHTML = `

        <div class="cardFoto">

            ${frete.foto ? `

                <div class="fotoContainer">

                    <img

                        src="${frete.foto}"

                        class="fotoCard"

                        onclick="abrirFoto('${frete.foto}')"

                    >

                </div>

            ` : ""}

        </div>

        <div class="cardInfo">

            <h3>

                📦 O.S. ${frete.os}

            </h3>

            <p>

                👤 <strong>Solicitante:</strong>

                ${frete.solicitante}

            </p>

            <p>

                🛠 <strong>Responsável:</strong>

                ${frete.responsavel}

            </p>

            <p>

                📄 <strong>Serviço:</strong>

                ${frete.descricao}

            </p>

            <p class="valor">

                💰 ${formatarMoeda(frete.valor)}

            </p>

            <p>

                📅 ${frete.data}

            </p>

            <p class="obs">

                📝 ${frete.obs || "-"}

            </p>

        </div>

        <div class="acoes">

            <button

                class="btnPdfFrete"

                onclick="gerarPDFFrete(${frete.id})"

            >

                📄 PDF

            </button>

            <button

                class="btnEditar"

                onclick="editarFrete(${frete.id})"

            >

                ✏ Editar

            </button>

            <button

                class="btnExcluir"

                onclick="excluirFrete(${frete.id})"

            >

                🗑 Excluir

            </button>

        </div>

    `;

    return card;
}

// =======================================
// Excluir
// =======================================

async function excluirFrete(id){

    const confirmar = confirm(

        "Deseja excluir este frete?"

    );

    if(!confirmar){

        return;

    }

    if(editandoId === id){
        cancelarEdicao();
    }

    await excluirBanco(id);

    fretes = fretes.filter(

        f => f.id !== id

    );

    atualizarResumo();

    renderizarFretes();

}

// =======================================
// Modal Foto
// =======================================

function abrirFoto(src){

    document

        .getElementById("imagemModal")

        .src = src;

    document

        .getElementById("modalFoto")

        .style.display = "flex";

}

function fecharFoto(){

    document

        .getElementById("modalFoto")

        .style.display = "none";

}

// =======================================
// Utilitário
// =======================================

function formatarMoeda(valor){

    return Number(valor)

        .toLocaleString(

            "pt-BR",

            {

                style:"currency",

                currency:"BRL"

            }

        );

}

// =======================================
// app.js
// Parte 3
// Gerar PDF (layout moderno)
// =======================================

function calcularEncaixe(larguraOriginal, alturaOriginal, boxLargura, boxAltura){

    const razaoOriginal = larguraOriginal / alturaOriginal;
    const razaoBox = boxLargura / boxAltura;

    let largura, altura;

    if(razaoOriginal > razaoBox){
        largura = boxLargura;
        altura = boxLargura / razaoOriginal;
    }else{
        altura = boxAltura;
        largura = boxAltura * razaoOriginal;
    }

    return { largura, altura };
}

function desenharCabecalhoSimples(pdf, margem){

    pdf.setFillColor(21,101,192);
    pdf.rect(0, 0, 210, 16, "F");

    pdf.setTextColor(255,255,255);
    pdf.setFont("helvetica","bold");
    pdf.setFontSize(11);
    pdf.text("FreteControl", margem, 10);

    pdf.setTextColor(0,0,0);

    return 24;
}

async function construirPDF(lista, subtitulo, nomeArquivo){

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");

    const margem = 14;
    const larguraUtil = 210 - margem * 2;

    let total = 0;
    lista.forEach(f => { total += Number(f.valor); });

    // ===== Cabeçalho principal =====

    pdf.setFillColor(21,101,192);
    pdf.rect(0, 0, 210, 34, "F");

    pdf.setFillColor(13,71,161);
    pdf.rect(0, 34, 210, 2, "F");

    pdf.setTextColor(255,255,255);
    pdf.setFont("helvetica","bold");
    pdf.setFontSize(24);
    pdf.text("FreteControl", margem, 18);

    pdf.setFont("helvetica","normal");
    pdf.setFontSize(11);
    pdf.text(subtitulo, margem, 26);

    pdf.setFontSize(9);
    pdf.text(
        "Emitido em " + new Date().toLocaleDateString("pt-BR"),
        210 - margem,
        18,
        { align: "right" }
    );

    pdf.setTextColor(0,0,0);

    // ===== Cards de resumo =====

    let y = 44;
    const gapResumo = 6;
    const larguraResumo = (larguraUtil - gapResumo * 2) / 3;
    const alturaResumo = 22;

    const resumos = [
        { label: "FRETES", valor: String(lista.length) },
        { label: "VALOR TOTAL", valor: formatarMoeda(total) },
        { label: "EMITIDO EM", valor: new Date().toLocaleDateString("pt-BR") }
    ];

    resumos.forEach((item, i) => {

        const x = margem + i * (larguraResumo + gapResumo);

        pdf.setFillColor(245,245,245);
        pdf.setDrawColor(225,225,225);
        pdf.roundedRect(x, y, larguraResumo, alturaResumo, 3, 3, "FD");

        pdf.setTextColor(120,120,120);
        pdf.setFont("helvetica","bold");
        pdf.setFontSize(8);
        pdf.text(item.label, x + larguraResumo/2, y + 8, { align: "center" });

        pdf.setTextColor(21,101,192);
        pdf.setFont("helvetica","bold");
        pdf.setFontSize(13);
        pdf.text(item.valor, x + larguraResumo/2, y + 17, { align: "center" });
    });

    pdf.setTextColor(0,0,0);

    y += alturaResumo + 12;

    // ===== Cards de cada frete =====

    for(const frete of lista){

        const paddingCard = 8;
        const alturaFotoBox = 40;
        const larguraTextoDireita = larguraUtil - alturaFotoBox - paddingCard * 3;

        pdf.setFont("helvetica","normal");
        pdf.setFontSize(10);

        const descLinhas = pdf.splitTextToSize(frete.descricao || "-", larguraTextoDireita);
        const obsLinhas = frete.obs ? pdf.splitTextToSize(frete.obs, larguraUtil - paddingCard * 2) : [];

        // posições relativas (a partir do topo do card)
        const dOS = paddingCard + 4;
        const dLabels = dOS + 8;
        const dValores = dLabels + 4.5;
        const dDataLabel = dValores + 7;
        const dDataValor = dDataLabel + 4.5;
        const dServLabel = dDataValor + 7;
        const dDescInicio = dServLabel + 4.5;
        const fimTextoDireita = dDescInicio + (descLinhas.length - 1) * 4.5 + 3;
        const fimFoto = paddingCard + alturaFotoBox;

        let dObsInicio = 0;
        let alturaObsBox = 0;

        if(obsLinhas.length > 0){
            dObsInicio = Math.max(fimTextoDireita + 3, fimFoto + 4);
            alturaObsBox = obsLinhas.length * 4.2 + 8;
        }

        const fimConteudo = obsLinhas.length > 0
            ? dObsInicio + alturaObsBox
            : Math.max(fimTextoDireita, fimFoto);

        const alturaCard = fimConteudo + paddingCard;

        if(y + alturaCard > 283){
            pdf.addPage();
            y = desenharCabecalhoSimples(pdf, margem);
        }

        // sombra leve + card branco
        pdf.setFillColor(235,235,235);
        pdf.roundedRect(margem + 1, y + 1, larguraUtil, alturaCard, 4, 4, "F");

        pdf.setFillColor(255,255,255);
        pdf.setDrawColor(225,225,225);
        pdf.roundedRect(margem, y, larguraUtil, alturaCard, 4, 4, "FD");

        // caixa da foto
        const xFoto = margem + paddingCard;
        const yFoto = y + paddingCard;

        pdf.setFillColor(240,240,240);
        pdf.roundedRect(xFoto, yFoto, alturaFotoBox, alturaFotoBox, 3, 3, "F");

        if(frete.foto){
            try{
                const largOrig = frete.fotoLargura || 1;
                const altOrig = frete.fotoAltura || 1;
                const encaixe = calcularEncaixe(largOrig, altOrig, alturaFotoBox - 4, alturaFotoBox - 4);
                const offX = xFoto + (alturaFotoBox - encaixe.largura) / 2;
                const offY = yFoto + (alturaFotoBox - encaixe.altura) / 2;

                pdf.addImage(frete.foto, "JPEG", offX, offY, encaixe.largura, encaixe.altura);
            }catch(e){}
        }else{
            pdf.setTextColor(180,180,180);
            pdf.setFontSize(9);
            pdf.text("Sem foto", xFoto + alturaFotoBox/2, yFoto + alturaFotoBox/2, { align: "center" });
            pdf.setTextColor(0,0,0);
        }

        // coluna de texto
        const xTexto = xFoto + alturaFotoBox + paddingCard;

        pdf.setFont("helvetica","bold");
        pdf.setFontSize(14);
        pdf.setTextColor(21,101,192);
        pdf.text("O.S. " + frete.os, xTexto, y + dOS);

        // selo do valor
        const valorTexto = formatarMoeda(frete.valor);
        pdf.setFontSize(11);
        const larguraSelo = pdf.getTextWidth(valorTexto) + 10;
        const xSelo = margem + larguraUtil - paddingCard - larguraSelo;

        pdf.setFillColor(10,143,61);
        pdf.roundedRect(xSelo, y + paddingCard - 2, larguraSelo, 9, 4, 4, "F");
        pdf.setTextColor(255,255,255);
        pdf.setFont("helvetica","bold");
        pdf.text(valorTexto, xSelo + larguraSelo/2, y + paddingCard + 4, { align: "center" });

        pdf.setTextColor(120,120,120);
        pdf.setFont("helvetica","bold");
        pdf.setFontSize(9);
        pdf.text("SOLICITANTE", xTexto, y + dLabels);
        pdf.text("RESPONSÁVEL", xTexto + larguraTextoDireita/2, y + dLabels);

        pdf.setTextColor(50,50,50);
        pdf.setFont("helvetica","normal");
        pdf.setFontSize(10);
        pdf.text(frete.solicitante, xTexto, y + dValores);
        pdf.text(frete.responsavel, xTexto + larguraTextoDireita/2, y + dValores);

        pdf.setTextColor(120,120,120);
        pdf.setFont("helvetica","bold");
        pdf.setFontSize(9);
        pdf.text("DATA", xTexto, y + dDataLabel);

        pdf.setTextColor(50,50,50);
        pdf.setFont("helvetica","normal");
        pdf.setFontSize(10);
        pdf.text(frete.data, xTexto, y + dDataValor);

        pdf.setTextColor(120,120,120);
        pdf.setFont("helvetica","bold");
        pdf.setFontSize(9);
        pdf.text("SERVIÇO", xTexto, y + dServLabel);

        pdf.setTextColor(50,50,50);
        pdf.setFont("helvetica","normal");
        pdf.setFontSize(10);
        pdf.text(descLinhas, xTexto, y + dDescInicio);

        if(obsLinhas.length > 0){

            const yObs = y + dObsInicio;

            pdf.setFillColor(248,248,248);
            pdf.roundedRect(margem + paddingCard, yObs, larguraUtil - paddingCard * 2, alturaObsBox, 2, 2, "F");

            pdf.setFontSize(8.5);
            pdf.setTextColor(130,130,130);
            pdf.setFont("helvetica","bold");
            pdf.text("OBSERVAÇÕES", margem + paddingCard * 2, yObs + 5);

            pdf.setFontSize(9.5);
            pdf.setTextColor(70,70,70);
            pdf.setFont("helvetica","normal");
            pdf.text(obsLinhas, margem + paddingCard * 2, yObs + 9.5);
        }

        pdf.setTextColor(0,0,0);

        y += alturaCard + 8;
    }

    // ===== Rodapé em todas as páginas =====

    const totalPaginas = pdf.internal.getNumberOfPages();

    for(let i = 1; i <= totalPaginas; i++){

        pdf.setPage(i);

        pdf.setDrawColor(225,225,225);
        pdf.line(margem, 290, 210 - margem, 290);

        pdf.setFontSize(8);
        pdf.setTextColor(150,150,150);
        pdf.setFont("helvetica","normal");
        pdf.text("FreteControl", margem, 294);
        pdf.text("Página " + i + " de " + totalPaginas, 210 - margem, 294, { align: "right" });
    }

    pdf.save(nomeArquivo);
}

// ===== Gerar PDF de uma semana específica =====

function gerarPDFSemana(chave){

    const grupos = agruparPorSemana(fretes);
    const grupo = grupos.find(g => g.chave === chave);

    if(!grupo) return;

    const nomeArquivo =
        "Semana_" + formatarDataCurta(grupo.inicio).replace("/", "-") +
        "_a_" + formatarDataCurta(grupo.fim).replace("/", "-") + ".pdf";

    construirPDF(grupo.fretes, grupo.label, nomeArquivo);
}

// ===== Gerar PDF de um único frete =====

function gerarPDFFrete(id){

    const frete = fretes.find(f => f.id === id);

    if(!frete) return;

    construirPDF([frete], "O.S. " + frete.os, "OS_" + frete.os + ".pdf");
}

// =======================================
// app.js
// Parte 4
// Gerar Excel
// =======================================

function construirExcel(lista, nomeArquivo){

    const wb = XLSX.utils.book_new();

    const dados = [];

    dados.push([

        "Data",

        "Solicitante",

        "Responsável",

        "O.S.",

        "Serviço",

        "Observações",

        "Frete"

    ]);

    lista.forEach(frete=>{

        dados.push([

            frete.data,

            frete.solicitante,

            frete.responsavel,

            frete.os,

            frete.descricao,

            frete.obs,

            Number(frete.valor)

        ]);

    });

    const ws = XLSX.utils.aoa_to_sheet(dados);

    ws["!cols"]=[

        {wch:20},

        {wch:30},

        {wch:28},

        {wch:15},

        {wch:55},

        {wch:60},

        {wch:18}

    ];

    for(let i=2;i<=lista.length+1;i++){

        const valor="G"+i;

        if(ws[valor]){

            ws[valor].t="n";

            ws[valor].z='"R$" #,##0.00';

        }

    }

    ws["!rows"]=[];

    for(let i=0;i<=lista.length;i++){

        ws["!rows"].push({

            hpt:45

        });

    }

    XLSX.utils.book_append_sheet(

        wb,

        ws,

        "Fretes"

    );

    XLSX.writeFile(

        wb,

        nomeArquivo

    );

}

// ===== Gerar Excel de uma semana específica =====

function gerarExcelSemana(chave){

    const grupos = agruparPorSemana(fretes);
    const grupo = grupos.find(g => g.chave === chave);

    if(!grupo) return;

    const nomeArquivo =
        "Semana_" + formatarDataCurta(grupo.inicio).replace("/", "-") +
        "_a_" + formatarDataCurta(grupo.fim).replace("/", "-") + ".xlsx";

    construirExcel(grupo.fretes, nomeArquivo);
}

// =======================================
// Registrar Service Worker
// =======================================

if("serviceWorker" in navigator){

    window.addEventListener(

        "load",

        ()=>{

            navigator.serviceWorker.register(

                "./service-worker.js"

            );

        }

    );

}