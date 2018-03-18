document.addEventListener("DOMContentLoaded", () => {

    const video  = document.getElementById('video-for-canvas');
    const w = video.clientWidth;
    const h = video.clientHeight;

    let canvasM = document.getElementById('canvas-for-video');
    canvasM.width = w;
    canvasM.height = h;
    let ctx = canvasM.getContext('2d');

    let backLayer = document.createElement('canvas');
    backLayer.width = w;
    backLayer.height = h;
    let backCtx = backLayer.getContext('2d');

    let backLayer2 = document.createElement('canvas');
    backLayer2.width = w;
    backLayer2.height = h;
    let backLayer2Ctx = backLayer2.getContext('2d');

    //Инициализация Web Audio Api
    let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let source;
    let analyser = audioCtx.createAnalyser();

    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

    if (navigator.getUserMedia) {
        navigator.getUserMedia({ audio: true, video: true }, (stream) => {
                video.src = URL.createObjectURL(stream);

                //Настройка Web Audio Api
                analyser.minDecibels = -90;
                analyser.maxDecibels = 30;
                analyser.fftSize = 256;

                let distortion = audioCtx.createWaveShaper();
                let gainNode = audioCtx.createGain();
                let biquadFilter = audioCtx.createBiquadFilter();
                let convolver = audioCtx.createConvolver();

                source = audioCtx.createMediaStreamSource(stream);
                source.connect(analyser);
                analyser.connect(distortion);
                distortion.connect(biquadFilter);
                biquadFilter.connect(convolver);
                convolver.connect(gainNode);
                gainNode.connect(audioCtx.destination);

                //Визуализация эффектов
                visualizeContent();

            }, (err) => {
                console.log("Произошла ошибка: " + err.name);
            }
        );
    } else {
        alert("getUserMedia не поддерживается.");
    }

    let visualAudioCanvas = document.getElementById('visualizer-volume');
    let canvasVolumeCtx = visualAudioCanvas.getContext("2d");
    const volumeCanvasWidth = visualAudioCanvas.width;
    const volumeCanvasHeight = visualAudioCanvas.height;

    let visualAudioFreqCanvas = document.getElementById('visualizer-freq');
    let canvasFreqCtx = visualAudioFreqCanvas.getContext("2d");
    const freqCanvasWidth = visualAudioFreqCanvas.width;
    const freqCanvasHeight = visualAudioFreqCanvas.height;

    let convulsionsFlag = false;

    //Переменные для детекции движения
    const detectMotion = true;
    const motionDetectionInterval = 10;
    const motionPixelAccuracy = Math.floor(0.0015 * w * h);
    let motionInProgress = false;
    let prevImageArray = [];
    let loopCounter = 0;

    let visualizeContent = () => {
        backCtx.drawImage(video, 0, 0, w, h);

        //Детекция движения
        if (detectMotion) {
            __detectMotion();
        }

        if (!convulsionsFlag) {
            //Эффект помех / плохого сигнала
            __badSignalEffect();

            //Наложение инфракрасного эффекта
            ctx.globalCompositeOperation = 'color';
            ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
            ctx.fillRect(0, 0, w, h);
        }

        let uInt8Array =  new Uint8Array(analyser.frequencyBinCount);

        //Отрисовка звуковых частот (спектрограмма)
        __frequencyBars(uInt8Array);

        //Отрисовка уровня громкости
        __volumeLevel(uInt8Array);

        requestAnimationFrame(visualizeContent);
    };

    let getVolume = (array) => {
        let values = 0;

        for (let i = 0; i < array.length; i++) {
            values += array[i];
        }

        return values / array.length;
    };

    let getRandomInt = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    let initRandomSymbols = () => {
        const freq = 1500;
        const symbols = "@#$%^&*!~0123456789";
        const stringsNumber = 5;
        const spaceIndex = 5;
        const stringLength = 30;

        let localResult = "";
        let divs = [];

        let __getRandomSymbols = () => {
            setTimeout(() => {
                for (let j = 0; j < stringsNumber; j++) {
                    let div = document.createElement('div');
                    div.classList.add('code-line');

                    for (let i = 0; i < stringLength; i++) {
                        if (i % spaceIndex === 0) {
                            localResult += " ";
                        } else {
                            localResult += symbols.charAt(Math.floor(Math.random() * symbols.length));
                        }
                    }

                    div.innerHTML = localResult;
                    localResult = "";
                    divs.push(div);
                }

                document.getElementsByClassName("typewriter")[0].innerHTML = "";

                for (let k = 0; k < stringsNumber; k++) {
                    document.getElementsByClassName('typewriter')[0].appendChild(divs[k]);
                }

                divs = [];

                __getRandomSymbols();
            }, freq);
        };

        __getRandomSymbols();
    };

    initRandomSymbols();

    let _motionDetected = () => {
        if (!motionInProgress) {
            motionInProgress = true;
            document.getElementsByClassName('motion-identifier')[0].classList.add('show');

            setTimeout(() => {
                motionInProgress = false;
                document.getElementsByClassName('motion-identifier')[0].classList.remove('show');
            }, 1000);
        }
    };

    let _gotConvulsions = () => {
        convulsionsFlag = true;

        document.getElementsByClassName('loud-volume-identifier')[0].classList.add('show');

        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = 'rgb(0,0,255)';
        ctx.fillRect(0, 0, w, h);

        setTimeout(() => {
            convulsionsFlag = false;
            document.getElementsByClassName('loud-volume-identifier')[0].classList.remove('show');
        }, 3000);
    };

    let __badSignalEffect = () => {
        const frequenceOfBlink = 25;
        const anyNumber = 5;
        const numberOfBlinkingPictures = 4;

        if (getRandomInt(0, frequenceOfBlink) === anyNumber) {
            backLayer2Ctx.drawImage(video, 0, 0, w, h);
            let im2data = backLayer2Ctx.getImageData(0, 0, w, h);

            for (let k = 0; k < numberOfBlinkingPictures; k++) {
                backCtx.putImageData(im2data, getRandomInt(-w, w), getRandomInt(-h, h));
            }
        }

        let imgData = backCtx.getImageData(0, 0, w, h);
        ctx.putImageData(imgData, 0, 0);
    };

    let __frequencyBars = (arr) => {
        analyser.getByteFrequencyData(arr);

        canvasFreqCtx.fillStyle = 'rgb(53, 53, 53)';
        canvasFreqCtx.fillRect(0, 0, freqCanvasWidth, freqCanvasHeight);

        let barWidth = (freqCanvasWidth / analyser.frequencyBinCount) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < analyser.frequencyBinCount; i++) {
            barHeight = arr[i];

            canvasFreqCtx.fillStyle = 'rgb(' + ( barHeight + 150 ) + ', 250, 0)';
            canvasFreqCtx.fillRect(x, freqCanvasHeight - barHeight / 2, barWidth, barHeight / 2);

            x += barWidth + 1;
        }
    };

    let __volumeLevel = (arr) => {
        const volumeSensitivity = 3;

        let average = getVolume(arr);
        let pxVolume = average * volumeSensitivity;

        canvasVolumeCtx.clearRect(0, 0, volumeCanvasWidth, volumeCanvasHeight);
        canvasVolumeCtx.fillStyle = 'rgb(255, 250, 0)';
        canvasVolumeCtx.fillRect(0, 0, pxVolume, volumeCanvasHeight);

        //При превышении определенного уровня громкости - наступает эффект контузии.
        const limitOfVolume = 250;

        if (pxVolume > limitOfVolume && !convulsionsFlag) {
            _gotConvulsions();
        }
    };

    let __detectMotion = () => {
        let diffPixels = 0;
        loopCounter++;

        if (prevImageArray.length !== 0 && loopCounter === motionDetectionInterval) {
            let imgDataArray = backCtx.getImageData(0, 0, w, h).data;
            let difference = 0;

            for (let j = 0; j < imgDataArray.length / 4; j++) {
                difference += Math.abs(imgDataArray[4 * j] - prevImageArray[4 * j]);
                difference += Math.abs(imgDataArray[4 * j + 1] - prevImageArray[4 * j + 1]);
                difference += Math.abs(imgDataArray[4 * j + 2] - prevImageArray[4 * j + 2]);

                if (difference > 70) {
                    diffPixels++;
                }

                if (diffPixels === motionPixelAccuracy) {
                    _motionDetected();
                    diffPixels = 0;
                    break;
                }

                difference = 0;
            }

            loopCounter = 0;
        }

        prevImageArray = backCtx.getImageData(0, 0, w, h).data;
    }
});
