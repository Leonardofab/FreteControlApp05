// =======================================
// database.js
// FreteControl v3
// =======================================

const DB_NAME = "FreteControlDB";

const DB_VERSION = 1;

const STORE = "fretes";

let db = null;

// ==========================
// Inicialização
// ==========================

function iniciarBanco(){

    return new Promise((resolve,reject)=>{

        const request = indexedDB.open(

            DB_NAME,

            DB_VERSION

        );

        request.onupgradeneeded = function(event){

            db = event.target.result;

            if(!db.objectStoreNames.contains(STORE)){

                db.createObjectStore(

                    STORE,

                    {

                        keyPath:"id"

                    }

                );

            }

        };

        request.onsuccess = function(event){

            db = event.target.result;

            resolve();

        };

        request.onerror = function(){

            reject("Erro ao abrir banco.");

        };

    });

}

// ==========================
// Salvar
// ==========================

function salvarFreteBanco(frete){

    return new Promise((resolve,reject)=>{

        const tx = db.transaction(

            STORE,

            "readwrite"

        );

        const store = tx.objectStore(STORE);

        const req = store.put(frete);

        req.onsuccess = ()=>resolve();

        req.onerror = ()=>reject();

    });

}

// ==========================
// Buscar Todos
// ==========================

function carregarBanco(){

    return new Promise((resolve,reject)=>{

        const tx = db.transaction(

            STORE,

            "readonly"

        );

        const store = tx.objectStore(STORE);

        const req = store.getAll();

        req.onsuccess = ()=>{

            resolve(req.result);

        };

        req.onerror = ()=>reject();

    });

}

// ==========================
// Excluir
// ==========================

function excluirBanco(id){

    return new Promise((resolve,reject)=>{

        const tx = db.transaction(

            STORE,

            "readwrite"

        );

        const store = tx.objectStore(STORE);

        const req = store.delete(id);

        req.onsuccess = ()=>resolve();

        req.onerror = ()=>reject();

    });

}

// ==========================
// Limpar Tudo
// ==========================

function limparBanco(){

    return new Promise((resolve,reject)=>{

        const tx = db.transaction(

            STORE,

            "readwrite"

        );

        const store = tx.objectStore(STORE);

        const req = store.clear();

        req.onsuccess = ()=>resolve();

        req.onerror = ()=>reject();

    });

}

// ==========================
// Backup JSON
// ==========================

async function exportarBackup(){

    const dados = await carregarBanco();

    const blob = new Blob(

        [

            JSON.stringify(

                dados,

                null,

                2

            )

        ],

        {

            type:"application/json"

        }

    );

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;

    a.download =

        "Backup_FreteControl.json";

    a.click();

    URL.revokeObjectURL(url);

}

// ==========================
// Restaurar Backup
// ==========================

async function importarBackup(arquivo){

    const texto = await arquivo.text();

    const dados = JSON.parse(texto);

    await limparBanco();

    for(const frete of dados){

        await salvarFreteBanco(frete);

    }

}