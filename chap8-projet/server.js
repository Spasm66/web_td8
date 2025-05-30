const fs = require('fs');
const path = require('path');
const host = 'localhost';
const port = 8080;
const http = require('http');
const server = http.createServer();
const { Client } = require('pg');
const querystring = require('querystring');

const client = new Client({
    user: 'lopfeiffer',
    password: 'Loris>47200',
    database: 'lopfeiffer',
    host: 'pgsql',
    port: 5432
});


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
    } else if (req.url == "/index") {
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
                            <div class="container">Voici mes photos</div>
                            <div class="container">`;
        try {
            const recent = await client.query(`SELECT idimage, fichier FROM images ORDER BY date DESC LIMIT 3;`);
            recent.rows.forEach((row) => {
                html += `<a href="/page-image/${row.idimage}"><img src="/public/images/${row.fichier.split(".")[0]}_small.jpg"></a>`;
            });
        } catch (err) {
            console.log(err);
            res.end('erreur: ressource introuvable');
        }
        html += `</div>
                <h1 class="container">Mon Mur d'Images</h1>
                <a class="container" href="/images">Toutes les images</a>
            </body>
            </html>`;
        res.end(html);
    } else if (req.url == "/images") {
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
            result.rows.forEach((row) => {
                html += `<a href="../page-image/${row.idimage}">
                <div class="inside">
                    <p>${row.nom}</p>
                    <img src="public/images/${row.fichier.split(".")[0]}_small.jpg">
                </div>
            </a>`;
            });
        } catch (error) {
            console.error('Error executing query', error);
        }
        html += `</div></body></html>`;
        res.end(html);
    } else if (/^\/page-image\/\d+\/vote=/.test(req.url)) {
        const id_com = parseInt(req.url.split("=")[1].split("&")[1], 10);
        if (isNaN(id_com)) {
            res.end("Invalid comment ID");
            return;
        }

        try {
            const nb_like_result = await client.query(`SELECT likes FROM commentaires WHERE idcommentaire = $1;`, [id_com]);
            const nb_like = nb_like_result.rows[0].likes || 0;

            const id_image_result = await client.query(`SELECT idimage FROM commentaires WHERE idcommentaire = $1;`, [id_com]);
            const id_image = id_image_result.rows[0].idimage;

            if (id_image === undefined) {
                res.end("Invalid image ID");
                return;
            }

            switch (req.url.split("=")[1].split("&")[0]) {
                case "Up":
                    await client.query(`UPDATE commentaires SET likes = $1 WHERE idcommentaire = $2;`, [nb_like + 1, id_com]);
                    break;
                case "Down":
                    await client.query(`UPDATE commentaires SET likes = $1 WHERE idcommentaire = $2;`, [nb_like - 1, id_com]);
                    break;
                default:
                    res.end("Invalid vote action");
                    return;
            }

            res.writeHead(302, { 'Location': `/page-image/${id_image}` });
            res.end();
        } catch (error) {
            console.error('Error executing query', error);
            res.end("Error updating vote");
        }
    } else if (req.url.startsWith("/page-image/")) {
        const id = parseInt(req.url.split("/")[2], 10);
        if (isNaN(id)) {
            res.end("page doesnt exist");
            return;
        }

        let html;
        let count;
        let prev_image;
        let next_image;
        let coms;

        try {
            const exist_result = await client.query(`SELECT COUNT(*) FROM images WHERE idimage = $1;`, [id]);
            const exist = exist_result.rows[0].count;

            if (exist === 0) {
                res.end("page doesnt exist");
                return;
            }

            count = parseInt((await client.query(`SELECT COUNT(*) FROM images;`)).rows[0].count, 10);
            const current_image_result = await client.query(`SELECT fichier, nom FROM images WHERE idimage = $1;`, [id]);
            const current_image = current_image_result.rows[0];

            prev_image = (await client.query(`SELECT fichier, nom FROM images WHERE idimage = $1;`, [id - 1])).rows[0];
            next_image = (await client.query(`SELECT fichier, nom FROM images WHERE idimage = $1;`, [id + 1])).rows[0];
            coms = await client.query(`SELECT texte, likes, idcommentaire FROM commentaires WHERE idimage = $1 ORDER BY likes DESC;`, [id]);

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
                                <h2 style="text-align: center">${current_image.nom}</h2>
                                <div class="container">
                                    <img src="../public/images/${current_image.fichier}">
                                </div>`;
        } catch (error) {
            console.error('Error executing query', error);
            res.end("Error loading page");
            return;
        }

        html += `<div style="display: flex; flex-direction: column; align-items: center; margin-top: 20px;">
                    <form action="/image-description" method="post">
                        <input type="hidden" name="nb_image" value="${id}">
                        <input type="text" id="txt" name="description">
                        <input type="submit" value="envoyer">
                    </form>
					<script type="text/javascript" src="/public/page-image.js"></script>
                </div>`;

        coms.rows.forEach((row) => {
            html += `<div style="text-align: center; margin-bottom: 5px;">
                        <p style="display: inline; margin: 0; word-wrap: break-word">${row.texte}</p>
                        <a style="display: inline; margin: 0 5px; word-wrap: break-word" href="/page-image/${id}/vote=Up&${row.idcommentaire}">&#9195</a>
                        <p style="display: inline; margin: 0; word-wrap: break-word">${row.likes}</p>
                        <a style="display: inline; margin: 0 5px; word-wrap: break-word" href="/page-image/${id}/vote=Down&${row.idcommentaire}">&#9196</a>
                    </div>`;
        });

        html += `<div class="container">`;
        if (prev_image) {
            html += `<a href="${id - 1}">
                        <p>Prev Image</p>
                        <img src="../public/images/${prev_image.fichier.split(".")[0]}_small.jpg">
                    </a>`;
        }
        if (next_image) {
            html += `<a href="${id + 1}">
                        <p>Next Image</p>
                        <img src="../public/images/${next_image.fichier.split(".")[0]}_small.jpg">
                    </a>`;
        }
        html += `</div></body></html>`;
        res.end(html);
    } else if (req.method === "POST" && req.url === "/image-description") {
        let donne;
        req.on("data", (data) => {
            donne = data.toString();
        });
        req.on("end", async () => {
            const parsedData = querystring.parse(donne);
            let com = parsedData.description
            let key = parsedData.nb_image;
            if (!com.includes("DROP")) {
                try {
                await client.query('INSERT INTO commentaires (idimage, texte) VALUES ($1, $2)', [key, com]);
                res.writeHead(302, { 'Location': `/page-image/${key}` });
                res.end();
                } catch (error) {
                    console.error('Error executing query', error);
                    res.end("Error saving comment");
                }
            }
            
        });
    }
});

server.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}/`);
});
