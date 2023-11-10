const standardFrequency = [82.4069, 110.0, 146.832, 195.998, 246.942, 329.628];
const stringsName = ["E", "A", "D", "G", "B", "E"];
let stringBeingTuned;
let stringElement;
let hzElement;
let errorElement;

function init() {
  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      useStream(stream);
    })
    .catch((err) => {
      console.error(`${err.name}: ${err.message}`);
    });

  stringElement = document.getElementById("string");
  hzElement = document.getElementById("hz");
  errorElement = document.getElementById("error");
}

function useStream(stream) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const microphone = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  microphone.connect(analyser);
  analyser.fftSize = 4096;
  const bufferLength = analyser.frequencyBinCount;

  function autoCorrelation() {
    const buffer = new Float32Array(bufferLength);
    analyser.getFloatTimeDomainData(buffer);
    let amplitude = buffer.reduce((acc, value) => acc + value) / bufferLength;

    if (amplitude > 0.00025) {
      let minDiff = Infinity;
      for (let i = 0; i < 6; i++) {
        let difference = 0;
        const offset = Math.floor(
          audioContext.sampleRate / standardFrequency[i]
        );
        for (let j = 0; j < bufferLength - offset; j++) {
          difference += Math.abs(buffer[j] - buffer[j + offset]);
        }
        difference /= bufferLength;

        if (difference < minDiff) {
          minDiff = difference;
          stringBeingTuned = i;
        }
      }

      let upperLimit, lowerLimit;

      if (stringBeingTuned === 0) upperLimit = 650;
      else
        upperLimit = Math.floor(
          (audioContext.sampleRate / standardFrequency[stringBeingTuned - 1] +
            audioContext.sampleRate / standardFrequency[stringBeingTuned]) /
            2
        );

      if (stringBeingTuned === 5) lowerLimit = 100;
      else
        lowerLimit = Math.floor(
          (audioContext.sampleRate / standardFrequency[stringBeingTuned] +
            audioContext.sampleRate / standardFrequency[stringBeingTuned + 1]) /
            2
        );

      let frequency;
      minDiff = Infinity;

      for (let i = lowerLimit; i <= upperLimit; i++) {
        let difference = 0;
        for (let j = 0; j < bufferLength - i; j++) {
          difference += Math.abs(buffer[j] - buffer[j + i]);
        }

        if (difference < minDiff) {
          minDiff = difference;
          frequency = Math.floor(audioContext.sampleRate / i);
        }
      }

      if (frequency && frequency > 120 && frequency < 630) {
        displayInfo(frequency);
      }
    }

    requestAnimationFrame(autoCorrelation);
  }

  autoCorrelation();
}

function displayInfo(frequency) {
  if (stringBeingTuned) {
    stringElement.textContent = `String: ${stringsName[stringBeingTuned]}`;
    hzElement.textContent = `Frequency: ${frequency.toFixed(
      1
    )} / ${standardFrequency[stringBeingTuned].toFixed(1)} Hz`;
    errorElement.textContent = `Error: ${
      (Math.abs(
        frequency.toFixed(1) - standardFrequency[stringBeingTuned].toFixed(1)
      ) *
        100) /
      standardFrequency[stringBeingTuned].toFixed(1)
    }%`;
  }
}

window.addEventListener("load", init);
