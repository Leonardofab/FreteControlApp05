// =======================================
// service-worker.js
// FreteControl v4
// =======================================

const CACHE_NAME = "fretecontrol-v7";

const ARQUIVOS = [

    "./",

    "./index.html",

    "./style.css",

    "./app.js",

    "./database.js",

    "./manifest.json",

    "./icon-192.png",

    "./icon-512.png",

    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",

    "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"

];

// ===========================
// Instalação
// ===========================

self.addEventListener("install", event=>{

    event.waitUntil(

        caches

        .open(CACHE_NAME)

        .then(cache=>cache.addAll(ARQUIVOS))

    );

    self.skipWaiting();

});

// ===========================
// Ativação
// ===========================

self.addEventListener("activate",event=>{

    event.waitUntil(

        caches

        .keys()

        .then(keys=>{

            return Promise.all(

                keys

                .filter(

                    key=>key!==CACHE_NAME

                )

                .map(

                    key=>caches.delete(key)

                )

            );

        })

    );

    self.clients.claim();

});

// ===========================
// Fetch
// ===========================

self.addEventListener("fetch",event=>{

    if(event.request.method!=="GET"){

        return;

    }

    event.respondWith(

        caches.match(event.request)

        .then(response=>{

            if(response){

                return response;

            }

            return fetch(event.request)

            .then(networkResponse=>{

                if(

                    !networkResponse ||

                    networkResponse.status!==200 ||

                    networkResponse.type!=="basic"

                ){

                    return networkResponse;

                }

                const copia=networkResponse.clone();

                caches

                .open(CACHE_NAME)

                .then(cache=>{

                    cache.put(

                        event.request,

                        copia

                    );

                });

                return networkResponse;

            })

            .catch(()=>{

                return caches.match("./index.html");

            });

        })

    );

});