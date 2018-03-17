document.addEventListener("DOMContentLoaded", () => {

    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

    if (navigator.getUserMedia) {
        const videoElement = document.querySelector('video');

        //Настройки для Web Audio Api
        var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        var source;
        var analyser = audioCtx.createAnalyser();
        analyser.minDecibels = -90;
        analyser.maxDecibels = 30;
        analyser.smoothingTimeConstant = 0.85;
        var distortion = audioCtx.createWaveShaper();
        var gainNode = audioCtx.createGain();
        var biquadFilter = audioCtx.createBiquadFilter();
        var convolver = audioCtx.createConvolver();

        navigator.getUserMedia({ audio: true, video: true }, (stream) => {
                videoElement.src = URL.createObjectURL(stream);

                //Audio
                source = audioCtx.createMediaStreamSource(stream);
                source.connect(analyser);
                analyser.connect(distortion);
                distortion.connect(biquadFilter);
                biquadFilter.connect(convolver);
                convolver.connect(gainNode);
                gainNode.connect(audioCtx.destination);

                _visualizeContent();
                _initRandomSymbols();

            }, (err) => {
                console.log("Произошла ошибка: " + err.name);
            }
        );
    } else {
        alert("getUserMedia не поддерживается.");
    }

    const video  = document.getElementById('video-for-canvas');
    const w = video.clientWidth;
    const h = video.clientHeight;

    let canvasM = document.getElementById('canvas-for-video');
    canvasM.width = w;
    canvasM.height = h;
    let ctx    = canvasM.getContext('2d');

    let back = document.createElement('canvas');
    back.width = w;
    back.height = h;
    let backCtx = back.getContext('2d');

    let back2 = document.createElement('canvas');
    back2.width = w;
    back2.height = h;
    let backCtx2 = back.getContext('2d');

    let visualAudioCanvas = document.getElementById('visualizer-volume');
    let canvasVolumeCtx = visualAudioCanvas.getContext("2d");

    let visualAudioFreqCanvas = document.getElementById('visualizer-freq');
    let canvasFreqCtx = visualAudioFreqCanvas.getContext("2d");

    let convulsionsFlag = false;

    const detectMotion = true;
    let prevImageArray = null;
    let motionDetectionInterval = 10;
    //0.05% - пороговая разница в px между изображениями, для идентификации движения.
    let motionPixelAccuracy = Math.floor(0.0015 * w * h);
    let loopCounter = 0;
    let diffPixels = 0;

    //Content
    let _visualizeContent = () => {

        var WIDTH = visualAudioCanvas.width;
        var HEIGHT = visualAudioCanvas.height;

        analyser.fftSize = 256;

        canvasVolumeCtx.clearRect(0, 0, WIDTH, HEIGHT);
        canvasFreqCtx.clearRect(0, 0, WIDTH, HEIGHT);

        let array =  new Uint8Array(analyser.frequencyBinCount);

        let draw = () => {

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

            requestAnimationFrame(draw);

            analyser.getByteFrequencyData(array);

            canvasFreqCtx.fillStyle = 'rgb(53, 53, 53)';
            canvasFreqCtx.fillRect(0, 0, visualAudioFreqCanvas.width, visualAudioFreqCanvas.height);

            let barWidth = (visualAudioFreqCanvas.width / analyser.frequencyBinCount) * 2.5;
            let barHeight;
            let x = 0;

            for (let i = 0; i < analyser.frequencyBinCount; i++) {
                barHeight = array[i];

                canvasFreqCtx.fillStyle = 'rgb(' + ( barHeight + 150 ) + ', 250, 0)';
                canvasFreqCtx.fillRect(x, visualAudioFreqCanvas.height - barHeight / 2, barWidth, barHeight / 2);

                x += barWidth + 1;
            }

            canvasVolumeCtx.clearRect(0, 0, WIDTH, HEIGHT);
            let average = getVolume(array);
            let pxVolume = average * 4;

            canvasVolumeCtx.fillStyle = 'rgb(255, 250, 0)';
            canvasVolumeCtx.fillRect(0,0,pxVolume,HEIGHT);

            //При превышении определенного уровня громкости - наступает эффект контузии на короткое время.
            if (pxVolume > 200 && !convulsionsFlag) {
                _gotConvulsions();
            }
        };

        draw();
    };

    let getVolume = (array) => {
        let values = 0;
        let average;

        for (let i = 0; i < array.length; i++) {
            values += array[i];
        }

        average = values / array.length;

        return average;
    };

    let getRandomInt = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    let _initRandomSymbols = () => {
        let freq = 1500;
        let symbols = "@#$%^&*!~0123456789";
        let stringsNumber = 5;
        let localResult = "";
        let divs = [];

        let __getRandomSymbols = () => {
            for (let j = 0; j < stringsNumber; j++) {
                let div = document.createElement('div');
                div.classList.add('code-line');

                for (let i = 0; i < 30; i++) {
                    if (i % 5 === 0) {
                        localResult += " ";
                    } else {
                        localResult += symbols.charAt(Math.floor(Math.random() * symbols.length));
                    }
                }

                div.innerHTML = localResult;
                localResult = "";
                divs.push(div);
            }

            setTimeout(() => {
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

    let _motionDetected = () => {
        if (!document.getElementsByClassName('motion-identifier')[0].classList.contains("show")) {
            document.getElementsByClassName('motion-identifier')[0].classList.add('show');

            setTimeout(() => {
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
        let frequenceOfBlink = 25;
        let anyNumber = 5;
        let numberOfBlinkingPictures = 4;

        if (getRandomInt(0, frequenceOfBlink) === anyNumber) {
            backCtx2.drawImage(video, 0, 0, w, h);
            let im2data = backCtx2.getImageData(0, 0, w, h);

            for (let k = 0; k < numberOfBlinkingPictures; k++) {
                backCtx.putImageData(im2data, getRandomInt(-w, w), getRandomInt(-h, h));
            }
        }

        let imgData = backCtx.getImageData(0, 0, w, h);
        ctx.putImageData(imgData, 0, 0);
    };

    let __detectMotion = () => {
        loopCounter++;
        backCtx.drawImage(video, 0, 0, w, h);

        if (prevImageArray && loopCounter === motionDetectionInterval) {
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