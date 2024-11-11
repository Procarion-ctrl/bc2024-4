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

// Функція для отримання картинки з http.cat, якщо її немає в кеші
const fetchImageFromHttpCat = async (statusCode, filePath) => {
    try {
        const imageUrl = `https://http.cat/${statusCode}`;
        const response = await superagent.get(imageUrl).responseType('arraybuffer');
        return response.body;
    } catch (err) {
        throw new Error('Image could not be fetched from http.cat');
    }
};

const requireListener = async function (req, res) {
    const code = req.url.slice(1);  // Отримуємо статусний код з URL
    const filePath = path.join(options.cache, `${code}.jpg`);  // Шлях до файлу

    switch (req.method) {
        case 'GET':
            try {
                // Перевірка, чи є файл у кеші
                if (fs.existsSync(filePath)) {
                    // Якщо файл існує, відправляємо його
                    const imageData = await fs.promises.readFile(filePath);
                    res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                    res.end(imageData);
                } else {
                    // Якщо файлу немає в кеші, робимо запит до http.cat
                    try {
                        const imageData = await fetchImageFromHttpCat(code, filePath);
                        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                        res.end(imageData);
                    } catch (err) {
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
            let body = '';
            req.on('data', chunk => {
                body += chunk;
            });

            req.on('end', async () => {
                try {
                    // Якщо картинка вже існує в кеші, відправляємо її назад
                    if (fs.existsSync(filePath)) {
                        const imageData = await fs.promises.readFile(filePath);
                        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                        res.end(imageData);
                    } else {
                        // Якщо картинка немає, завантажуємо її з http.cat
                        const imageData = await fetchImageFromHttpCat(code, filePath);
                        const imageUrl = `https://http.cat/${code}`;
                        const response = await superagent.get(imageUrl).responseType('arraybuffer');
                        await fs.promises.writeFile(filePath, Buffer.from(response.body));
                        res.writeHead(201);
                        res.end();

                        // Після завантаження зберігаємо картинку в кеш
                        await fs.promises.writeFile(filePath, Buffer.from(imageData));
                    }
                } catch (err) {
                    res.writeHead(500);
                    res.end('Error writing file');
                }
            });
            break;

        case 'DELETE':
            try {
                // Видалення файлу асинхронно
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

// Створення HTTP сервера
const server = http.createServer(requireListener);

// Прослуховування порту і хоста
server.listen(options.port, options.host, () => {
    console.log(`Server started: http://${options.host}:${options.port}`);
});