const SERIES_INVALIDAS = {
    "10": [{desde: 67250001, hasta: 67700000}, {desde: 69050001, hasta: 71300000}, {desde: 76310012, hasta: 85139995}, {desde: 86400001, hasta: 92250000}],
    "20": [{desde: 87280145, hasta: 91646549}, {desde: 96650001, hasta: 120950000}],
    "50": [{desde: 77100001, hasta: 97250000}, {desde: 98150001, hasta: 109850000}]
};

let worker = null;

async function iniciarSistema() {
    const status = document.getElementById('status-ocr');
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        document.getElementById('video').srcObject = stream;
        
        status.innerText = "Cargando IA...";
        worker = await Tesseract.createWorker();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        await worker.setParameters({ tessedit_char_whitelist: '0123456789AB' });
        
        status.innerText = "Sistema Listo. Enfoque el billete.";
        procesarLoop();
    } catch (e) { alert("Error de cámara o permisos."); }
}

async function procesarLoop() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = 640; canvas.height = 480;
    ctx.drawImage(video, 0, 0, 640, 480);

    const { data: { text } } = await worker.recognize(canvas);
    analizarTexto(text.replace(/\s/g, ''));
    
    setTimeout(procesarLoop, 1000); // Escaneo continuo cada segundo
}

function analizarTexto(rawText) {
    const status = document.getElementById('status-ocr');
    const resDiv = document.getElementById('resultado');
    
    // 1. Detectar Monto (Buscamos 10, 20 o 50 grandes)
    let monto = rawText.includes("50") ? "50" : rawText.includes("20") ? "20" : rawText.includes("10") ? "10" : null;
    if(monto) document.getElementById('display-monto').innerText = `Corte: Bs ${monto}`;

    // 2. Detectar Serie (8 números + Letra)
    const matchSerie = rawText.match(/(\d{8})([AB])/);
    
    if (matchSerie) {
        const numero = parseInt(matchSerie[1]);
        const letra = matchSerie[2];
        document.getElementById('display-serie').innerText = `Serie: ${numero} ${letra}`;

        resDiv.style.display = "block";

        if (letra === "A") {
            resDiv.innerText = "✅ SERIE A: BILLETE SEGURO";
            resDiv.className = "resultado-box valido";
        } else if (letra === "B" && monto) {
            const rangos = SERIES_INVALIDAS[monto];
            const esRobado = rangos.some(r => numero >= r.desde && numero <= r.hasta);
            
            if (esRobado) {
                resDiv.innerText = "⚠️ ¡ALERTA! SERIE B SIN VALOR LEGAL";
                resDiv.className = "resultado-box alerta";
            } else {
                resDiv.innerText = "✅ SERIE B: FUERA DE RANGO DE ROBO";
                resDiv.className = "resultado-box valido";
            }
        }
    }
}