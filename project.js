const { program } = require('commander');
const fs = require('fs');
const http = require('http');
const path = require('path');
const superagent = require('superagent');

program
    .option('-h, --host <path>', 'Server host')
    .option('-p, --port <path>', 'Server port')
    .option('-c, --cache <path>', 'Cache directory')
program.parse();

const options = program.opts();

const requireListener = async function (req, res) {
    const code = req.url.slice(1);
    const filePath = path.join(options.cache, `${code}.jpg`);
    
    // Функція для завантаження картинки з http.cat і кешування її
    const fetchAndCacheImage = async (statusCode) => {
        try {
            const response = await superagent.get(`https://http.cat/${statusCode}`).buffer(true);
            await fs.promises.writeFile(filePath, response.body);  // Збереження зображення як бінарного файлу
            return response.body;
        } catch (err) {
            console.error(`Error fetching image from http.cat: ${err.message}`);
            return null; // Якщо картинка не знайдена, повертаємо null
        }
    };

    switch (req.method) {
        case 'GET':
            try {
                if (fs.existsSync(filePath)) {
                    // Якщо файл є в кеші, надсилаємо його
                    const imageData = await fs.promises.readFile(filePath);
                    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                    res.end(imageData);
                } else {
                    // Якщо файлу немає в кеші, намагаємось завантажити з http.cat
                    const imageData = await fetchAndCacheImage(code);
                    if (imageData) {
                        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                        res.end(imageData);
                    } else {
                        res.writeHead(404);
                        res.end('Not Found');
                    }
                }
            } catch (err) {
                res.writeHead(500);
                res.end('Internal Server Error');
            }
            break;

        case 'PUT':
            let body = [];
            req.on('data', chunk => {
                body.push(chunk);
            });

            req.on('end', async () => {
                body = Buffer.concat(body);
                try {
                    if (!fs.existsSync(filePath)) {
                        await fs.promises.writeFile(filePath, body);
                    }
                    res.writeHead(201);
                    res.end();
                } catch (err) {
                    res.writeHead(500);
                    res.end('Error writing file');
                }
            });
            break;

        case 'DELETE':
            try {
                await fs.promises.unlink(filePath);
                res.writeHead(204);
                res.end();
            } catch (err) {
                res.writeHead(404);
                res.end('File not found');
            }
            break;

        default:
            res.writeHead(200);
            res.end('LAB4 Server');
    }
};

const server = http.createServer(requireListener);

server.listen(options.port, options.host, () => {
    console.log(`Server started: http://${options.host}:${options.port}`);
});