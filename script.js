
var fileName;
document.getElementById('fileInput').addEventListener('change', handleFile);
//Input Handler
function handleFile(event) {

    const fileInput = event.target;
    const file = fileInput.files[0];

    if (file && file.type === 'image/svg+xml') {
        var fileUploaded = document.getElementById('fileInput');
        fileName = fileUploaded.files[0].name;
        fileName = fileName.replace('svg', 'pws');
        readSVGFile(file);
    } else {
        alert('Please select a valid SVG file.');
    }
}
//Function called by the Handler
function readSVGFile(file) {
    const reader = new FileReader();


    reader.onload = function (event) {
        const svgContent = event.target.result;
        const modifiedSVG = modifySVGSize(svgContent);
        displayModifiedSVG(modifiedSVG);
        convertSVGToImage(modifiedSVG)
            .then((returnImageData) => {
                const imageData = returnImageData;
                const lumData = rgbaToLum(imageData);
                const compressedImage = compressImage(lumData); //Uint8Array
                convertSVGToPreview(modifiedSVG)
                    .then((returnPreviewData) => {
                        const previewData = returnPreviewData;
                        const compressedPreview = rgbaTo16bit(previewData); //Uint8Array
                        //create header, insert image & preview data
                        createFile(compressedImage, compressedPreview);
                    })
                    .catch((error) => {
                        console.error('PreviewError: ', error.message);
                    });
                //create the header of the file, add the imageData
            })
            .catch((error) => {
                console.error('Error:', error.message);
            });
        //Create the preview, add it to the file.
    };

    reader.readAsText(file);
}
//Resize the SVG
function modifySVGSize(svgContent) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(svgContent, 'image/svg+xml');

    const widthAttr = parseFloat(xmlDoc.documentElement.getAttribute('width').replace('mm', ''));
    const heightAttr = parseFloat(xmlDoc.documentElement.getAttribute('height').replace('mm', ''));

    const newWidth = 21.164 * widthAttr;
    const newHeight = 21.164 * heightAttr;

    xmlDoc.documentElement.setAttribute('width', `${newWidth}px`);
    xmlDoc.documentElement.setAttribute('height', `${newHeight}px`);

    return new XMLSerializer().serializeToString(xmlDoc);
}
//Display the SVG
function displayModifiedSVG(modifiedSVG) {
    const outputContainer = document.getElementById('output-container');
    const outputSVG = document.getElementById('output-svg');

    if (outputSVG) {
        outputContainer.removeChild(outputSVG);
    }

    const newSVG = new DOMParser().parseFromString(modifiedSVG, 'image/svg+xml').documentElement;
    newSVG.id = 'output-svg';

    outputContainer.appendChild(newSVG);
}
//Return an Image object of 2560x1440px in RGBa
function convertSVGToImage(modifiedSVG) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const svgElement = document.createElement('div');
        svgElement.innerHTML = modifiedSVG;

        const img = new Image();
        img.src = 'data:image/svg+xml;base64,' + btoa(modifiedSVG);

        img.onload = function () {
            // Set canvas dimensions based on the modified SVG size
            canvas.width = 2560;
            canvas.height = 1440;

            // Draw the modified SVG onto the canvas
            ctx.drawImage(img, 0, 0, parseFloat(img.width), parseFloat(img.height));

            // Get the pixelated image data as a data URL
            const pixelatedImageData = new Image();
            pixelatedImageData.src = canvas.toDataURL('image/png');
            //document.body.appendChild(pixelatedImageData);
            const returnImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            //Here, convert to lum then compress it and put the compressed data in resolve.
            resolve(returnImageData);
        };

        img.onerror = function () {
            reject(new Error('Error loading SVG image.'));
        };
    });
}
//Return an array of lum
function rgbaToLum(data) {
    const pixelCount = data.width * data.height;
    let imageLum = [pixelCount];
    for (let count = 0; count < pixelCount; count++) {
        if ((data.data[count * 4] > 127 || data.data[count * 4 + 1] > 127 || data.data[count * 4 + 2] > 127) || data.data[count * 4 + 3] < 127) {
            imageLum[count] = 0xff;
        }
        else {
            imageLum[count] = 0b00000000;
        }
    }
    return imageLum;
}
//return an array of compressed data
function compressImage(data) {
    const compressedData = [];
    let pixelCounter = 0;
    let previousPixelLuma = 0xf0;
    //read every pixel of the image
    while (pixelCounter < data.length) {
        let chunckSize = 0;
        while ((chunckSize < 127) && (previousPixelLuma == data[pixelCounter]) && (pixelCounter < data.length)) {
            chunckSize++;
            pixelCounter++;
        }
        if (pixelCounter > 0) {
            compressedData.push((previousPixelLuma < 127 ? 0b10000000 | chunckSize : chunckSize));
        }
        previousPixelLuma = data[pixelCounter];
    }
    let returnCompressedData = new Uint8Array(compressedData.length);
    for (let i = 0; i < compressedData.length; i++) {
        returnCompressedData[i] = compressedData[i];
    }
    return (compressedData);
}

//Return an Image object of 168x224px in RGBa
function convertSVGToPreview(modifiedSVG) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const svgElement = document.createElement('div');
        svgElement.innerHTML = modifiedSVG;

        const img = new Image();
        img.src = 'data:image/svg+xml;base64,' + btoa(modifiedSVG);

        img.onload = function () {
            // Set canvas dimensions based on the modified SVG size
            canvas.width = 168;
            canvas.height = 224;

            // Draw the modified SVG onto the canvas
            ctx.drawImage(img, 0, 0, 168, 226);

            // Get the pixelated image data as a data URL
            const pixelatedImageData = new Image();
            pixelatedImageData.src = canvas.toDataURL('image/png');
            document.body.appendChild(pixelatedImageData);
            const returnPreviewData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            resolve(returnPreviewData);
        };

        img.onerror = function () {
            reject(new Error('Error loading SVG image.'));
        };
    });
}
function rgbaTo16bit(data) {
    const pixelCount = data.width * data.height;
    let preview16bit = new Uint8Array(2 * pixelCount);
    for (let count = 0; count < pixelCount; count++) {
        const data16bit = (((data.data[count * 4] >> 3) << 11) + ((data.data[count * 4 + 1] >> 3) << 6) + ((data.data[count * 4 + 2] >> 2)));
        preview16bit[2 * count] = (data16bit >> 8) & 0xff;
        preview16bit[2 * count + 1] = data16bit & 0xff;
    }
    return preview16bit;
}

function createFile(imageData, previewData) {   //imageData & previewData are Uint8Array
    let fileHeader = new Uint8Array(49);
    let header = new Uint8Array(96)
    let previewHeader = new Uint8Array(28);
    let layerDef = new Uint8Array(52);

    fileHeader = [0x41, 0x4e, 0x59, 0x43, 0x55, 0x42, 0x49, 0x43, 0x00, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x00, 0x00, //Version 
        0x04, 0x00, 0x00, 0x00, //AreaNum
        0x30, 0x00, 0x00, 0x00, //HeaderAddr 
        0x00, 0x00, 0x00, 0x00, //Back[0]
        0x90, 0x00, 0x00, 0x00, //PreviewAddr               //add 0xc2 before 0x90
        0x00, 0x00, 0x00, 0x00, //Back[1]
        0xac, 0x26, 0x01, 0x00, //LayersDef                 //add 0xc2 before 0xac
        0x00, 0x00, 0x00, 0x00, //Back[2]
        0xe0, 0x26, 0x01, 0x00];//LayersImageAddr           //interpreted as 0xc3 0xe0 0x26 ...
    header = [0x48, 0x45, 0x41, 0x44, 0x45, 0x52, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x50, 0x00, 0x00, 0x00, //HeadLen 
        0x00, 0x00, 0x3d, 0x42, //xyPixel 
        0x00, 0x00, 0x80, 0x3f, //Zthickness                //c2 before 0x80
        0x00, 0x00, 0x00, 0x00, //NorTime
        0x00, 0x00, 0x00, 0x00, //OffTime
        0x00, 0x00, 0x80, 0x3f, //bottTime                  //c2 before 0x80
        0x00, 0x00, 0x80, 0x3f, //bottLayers
        0x00, 0x00, 0xc0, 0x40, //ZUpHeight                 //interpreted as 0x00 0x00 0xc3 0x80 0x40
        0x00, 0x00, 0x40, 0x40, //ZUpSpeed
        0x00, 0x00, 0x40, 0x40, //ZDownSpeed 
        0x91, 0xae, 0x03, 0x41, //Volume                    //interpreted as 0xc2 0x91 0xC2 0xae 0x03 0x41
        0x01, 0x00, 0x00, 0x00, //antiCount
        0xa0, 0x05, 0x00, 0x00, //ResX                      //0xc2 before 0xa0
        0x00, 0x0a, 0x00, 0x00, //ResY 
        0x91, 0xae, 0x03, 0x41, //Weight                    //interpreted as 0xc2 0x91 0xC2 0xae 0x03 0x41
        0xe8, 0xb0, 0x52, 0x40, //Price                     //interpreted as 0xc3 0xe8 0xc2 0xb0 0x52 0x40
        0x24, 0x00, 0x00, 0x00, //ResinType 
        0x00, 0x00, 0x00, 0x00, //UseIndividualPara 
        0x06, 0x00, 0x00, 0x00, //Back[1]
        0x00, 0x00, 0x00, 0x00, //Back[2] 
        0x00, 0x00, 0x00, 0x00];//Back[3]
    previewHeader = [0x50, 0x52, 0x45, 0x56, 0x49, 0x45, 0x57, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x0c, 0x26, 0x01, 0x00, //PreviewLen
        0xe0, 0x00, 0x00, 0x00, //Width                     //interpreted as 0xc3 0xa0 0x00 0x00 0x00
        0x2a, 0x00, 0x00, 0x00, //Mark
        0xa8, 0x00, 0x00, 0x00];//Height                    //interpreted as 0xc2 0xa8 0x00 0x00 0x00 0x00 => there are too many 0x00
    layerDef = [0x4c, 0x41, 0x59, 0x45, 0x52, 0x44, 0x45, 0x46, 0x00, 0x00, 0x00, 0x00,
        0x24, 0x00, 0x00, 0x00, //LayerDefLen
        0x01, 0x00, 0x00, 0x00, //LayerCount 
        0xe0, 0x26, 0x01, 0x00, //Layer0Addr                //interpreted as 0xc3 0xa0 0x26 0x01 0x00
        0x34, 0x73, 0x00, 0x00, //Layer0DataLen
        0x00, 0x00, 0xc0, 0x40, //Layer0Height              //interpreted as 0x00 0x00 0xc3 0x80 0x40
        0x00, 0x00, 0x40, 0x40, //Layer0Speed 
        0x00, 0x00, 0x80, 0x3f, //Layer0ExpTime             //interpreted as 0x00 0x00 0xc2 0x80 0x3f
        0x00, 0x00, 0x80, 0x3f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];//Layer0Back
    //Set the right values to the header (length of layer and exposure time)

    //Create a new Uint8Array to merge every array together
    let fileSize = fileHeader.length + header.length + previewHeader.length + previewData.length + layerDef.length + imageData.length;
    let filePws = new Uint8Array(fileSize);
    //let fileAsString = new Uint8Array(fileSize);

    filePws = fileHeader.concat(header, previewHeader, previewData, layerDef, imageData);
    //fileAsString = filePws.reduce(reduceFunction, "");

    //Download the file.
    var buff = new Uint8Array(filePws).buffer
    downloadFile([buff]);
}

function reduceFunction(previous, current) {
    let newString = String.fromCharCode(current);
    console.log('char ' + newString + ' = ' + newString.charCodeAt(0));
    let valueToReturn = previous + newString;
    return (valueToReturn);
}

//Downloader
function downloadFile(file) {

    const blob = new Blob(file, { type: "octet-stream" });  //type octet-stream create a downloadable file
    const href = URL.createObjectURL(blob);  //create a unique URL to downlaod [data]
    const a = Object.assign(document.createElement("a"), {
        href,
        style: "display:none",
        download: fileName,
    });
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(href);   //free the memory used by the URL
    a.remove();
}

//Change the endianness of a word
function convertMSBtoLSB(input, length) {
    // Convert the input to binary representation
    let binaryString = input.toString(2);

    // Pad the binary string with zeros to make its original length
    while (binaryString.length < (length * 8)) {
        binaryString = '0' + binaryString;
    }

    // Split the binary string into groups of 8 bits
    const chunks = binaryString.match(/.{1,8}/g);

    // Reverse the order of the chunks
    const reversedChunks = chunks.reverse();

    // Join the reversed chunks to get the LSB first binary string
    const lsbFirstBinaryString = reversedChunks.join('');

    // Convert the binary string back to a decimal number
    const lsbFirstNumber = parseInt(lsbFirstBinaryString, 2);

    return lsbFirstNumber.toString(16);
}
