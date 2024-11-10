const {program} = require('commander');
const fs = require('fs');
const http = require('http');

program
    .option('-h, --host <path>')
    .option('-p, --port <path>')
    .option('-c, --cache <path>')

program.parse();

const options = program.opts();

const requireListener = function(req, res){
    res.writeHead(200);
    res.end('LAB4 Server')
}

const server = http.createServer(requireListener);

if (!options.host || !options.port){
    if (!options.host){
        console.log('There is no component host');
    }else{
        console.log('There is no component port')
    }
}
else{
server.listen(options.port, options.host, () =>{
    console.log(`Server started: http://${options.host}:${options.port}`)
});};

