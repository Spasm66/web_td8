const fs = require('fs');
const path = require('path');
const host = 'localhost';
const port = 8080;
const http = require('http');
const server = http.createServer();
const { Client } = require('pg');

let commentaire = {};

const client = new Client({
    user : 'spasm',
    password: 'root', 
    database: 'application-image',
    port : 5432
})

client.connect()
.then(() => {
    console.log('Connected to database');
})
.catch((e) => {
    console.log('Error connecting to database');
    console.log(e);
});

server.on('request', async (req, res) => {
    if (req.url.startsWith('/public/')) {
        try {
            const fichier = fs.readFileSync('.' + req.url);
            res.end(fichier);
        } catch (err) {
            res.end('erreur: ressource introuvable');
        }
    }
    else if (req.url.startsWith("/page-image/") && parseInt(req.url.split("/")[2]) >= 0 && parseInt(req.url.split("/")[2]) <= fs.readdirSync("./public/images").length / 2) {
        const id = parseInt(req.url.split("/")[2]);
        let html = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <title>Image Page ${id}</title>
            <link rel="stylesheet" type="text/css" href="../public/styles.css">
        </head>
        <body>
            <a href="../images">
                <h2>Mur</h2>
            </a>
            <div class="container">
                <img src="../public/images/image${id}.jpg">
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; margin-top: 20px;">
                <form action="/image-description" method="post">
                    <input type="hidden" name="nb_image" value="${id}">
                    <input type="text" name="description">
                    <input type="submit" value="envoyer">
                </form>
            </div>
            
            `;
        if (commentaire[String(id)]){
            html += '<div style="display: flex; flex-direction: column; align-items: center;">';
            commentaire[String(id)].forEach((com) => {
                html += `<p>${com}</p>`;
            });
            html += '</div>';
        }
        if (id === 1) { 
            html += `<div class="container">
                    <a href="${id+1}">
                        <p>Next Image</p>
                        <img src="../public/images/image${id+1}_small.jpg">
                    </a>
                </div>
            </body>
            </html>`
        }
        else if (id === fs.readdirSync("./public/images").length / 2) {
            html += `<div class="container">
                    <a href="${id-1}">
                        <p>Prev Image</p>
                        <img src="../public/images/image${id-1}_small.jpg">
                    </a>
                </div>
            </body>
            </html>`;
        }
        else {
            html += `<div class="container">
                    <a href="${id-1}">
                        <p>Prev Image</p>
                        <img src="../public/images/image${id-1}_small.jpg">
                    </a>
                    <a href="${id+1}">
                        <p>Next Image</p>
                        <img src="../public/images/image${id+1}_small.jpg">
                    </a>
                </div>
            </body>
            </html>`;
        }
        res.end(html);
        
    }
    else if (req.method === "POST" && req.url === "/image-description")
    {
        let donne;
        req.on("data", (data) => {
            donne += data.toString();
        })
        req.on("end", () => {
            console.log(donne);
            let com = donne.split("description=")[1];
            let key = donne.split("&")[0].split("=")[1];
            if (!commentaire[key]) {
                commentaire[key] = [];
            }
            commentaire[key] = [...commentaire[key], com];
            console.log(commentaire);
            res.writeHead(302, { 'Location': `/page-image/${key}` });
            res.end();
        })
    }
    else {
        res.end(fs.readFileSync("public/index.html"));
    }
});

server.listen(port, host, async () => {
    console.log(`Server running at http://${host}:${port}/`);
    try {
        const result = await client.query('SELECT fichier FROM images');
        console.log(result.rows);
    } catch (error) {
        console.error('Error executing query', error);
    }
});