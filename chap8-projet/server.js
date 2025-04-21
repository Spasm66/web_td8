const fs = require('fs');
const path = require('path');
const host = 'localhost';
const port = 8081;
const http = require('http');
const server = http.createServer();
const { Client } = require('pg');

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
    else if (req.url == "/index") {
        let html = `<!DOCTYPE html>
                        <html lang="fr">
                        <head>
                            <title>Images</title>
                            <style>
                            img {
                                width: 100px;
                                height: 100px;
                            }
                            .container {
                                display: flex;
                                justify-content: center;
                            }
                            .container img {
                                margin-right: 10px;
                                margin-top: 10px;
                            }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                            <img src="/public/logo.png">
                            </div>
                            <div class="container">Voici mes photo</div>
                            <div class="container">`;
        try {
            const recent = await client.query(`SELECT idimage, fichier FROM images ORDER BY date DESC LIMIT 3;`);
            recent.rows.forEach((row) => {
                html += `<a href="/page-image/${row.idimage}"><img src="/public/images/${row.fichier.split(".")[0]}_small.jpg"></a>`
            });
        } catch (err) {
            res.end('erreur: ressource introuvable');
        }
        html += `</div>
                <h1 class="container">Mon Mur d'Images</h1>
                <a class="container" href="/images">Toutes les images</a>
            </body>
            </html>`;
        res.end(html);
    }
    else if (req.url == "/images") {
        let html = `<!DOCTYPE html>
        <html lang="en">
            <head>
            <meta charset="UTF-8">
                <title>Mon Mur d'images</title>
                <style>
                    .container {
                        display: flex;
                        flex-wrap: wrap;
                        margin-right: 0px;
                    }
                    .inside {
                        margin-right: 10px;
                    }
                </style>
            </head>
            <body>
                <a href="/index">Index</a>
                <h1 class="container">Le mur d'images</h1>
                <a href="public/image-description.html">Mettre un commentaire !</a>
                <div class="container">`;
        try {
            const result = await client.query('SELECT idimage, fichier, nom FROM images;');
            const fichiersImage = result.rows.forEach((row) => {
                html += `<a href="../page-image/${row.idimage}">
                <div class="inside">
                    <p>${row.nom}</p>
                    <img src="public/images/${row.fichier.split(".")[0]}_small.jpg">
                </div>
            </a>`
            });
        } catch (error) {
            console.error('Error executing query', error);
        }
        html += `</div></body></html>`;
        res.end(html);
    }
    else if (req.url.startsWith("/page-image/")) {
        const id = parseInt(req.url.split("/")[2]);
        if (isNaN(id)) {res.end("page doesnt exist")};
        let html;
        let count;
        let prev_image;
        let next_image;
        let coms;
        try {
            const exist = (await client.query(`SELECT  COUNT(idimage) FROM images WHERE idimage = ${id};`)).rows.length;
            if (!exist) {
                console.log(exist);
                res.end("page doesnt exist");
            };
            count = parseInt((await client.query(`SELECT  COUNT(idimage) FROM images;`)).rows[0].count);
            const curent_image = await client.query(`SELECT fichier, nom FROM images WHERE idimage = ${id}`);
            prev_image = await client.query(`SELECT fichier, nom FROM images WHERE idimage = ${id - 1}`);
            next_image = await client.query(`SELECT fichier, nom FROM images WHERE idimage = ${id + 1}`);
            coms = await client.query(`SELECT texte FROM commentaires WHERE idimage = ${id}`);
            html = `<!DOCTYPE html>
                            <html>
                            <head lang="en">
                                <meta charset="UTF-8">
                                <title>Image Page ${id}</title>
                                <link rel="stylesheet" type="text/css" href="../public/styles.css">
                            </head>
                            <body>
                                <a href="../images">
                                    <h2>Mur</h2>
                                </a>
                                <h2 style="text-align: center">${curent_image.rows[0].nom}</h2>
                                <div class="container">
                                    <img src="../public/images/${curent_image.rows[0].fichier}">
                                </div>`;
        } catch (error) {
            console.error('Error executing query', error);
        }
        html += `<div style="display: flex; flex-direction: column; align-items: center; margin-top: 20px;">
                    <form action="/image-description" method="post">
                        <input type="hidden" name="nb_image" value="${id}">
                        <input type="text" name="description">
                        <input type="submit" value="envoyer">
                    </form>
                </div>`
        coms.rows.forEach((row) => {
            html += `<p style="text-align: center">${row.texte}</p>`;
        })
        html += `<div class="container">`;
        if (prev_image.rows.length === 1) { 
            html += `<a href="${id-1}">
                        <p>Prev Image</p>
                        <img src="../public/images/${prev_image.rows[0].fichier.split(".")[0]}_small.jpg">
                    </a>`;
        }
        if (next_image.rows.length === 1) {
            html += `<a href="${id+1}">
                        <p>Next Image</p>
                        <img src="../public/images/${next_image.rows[0].fichier.split(".")[0]}_small.jpg">
                    </a>`;
        }
        html += `</div></body></html>`;
        res.end(html);
        
    }
    else if (req.method === "POST" && req.url === "/image-description")
    {
        let donne;
        req.on("data", (data) => {
            donne = data.toString();
        })
        req.on("end", async () => {
            console.log(donne);
            let com = donne.split("description=")[1];
            let key = donne.split("&")[0].split("=")[1];
            try {
                await client.query('INSERT INTO commentaires (idimage, texte) VALUES ($1, $2)', [key, com]);
                res.writeHead(302, { 'Location': `/page-image/${key}` });
                res.end();
            } catch (error) {
                console.error('Error executing query', error);
                res.end("Error saving comment");
            }
            });
        }
});

server.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}/`);
});