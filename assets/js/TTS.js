function TTS() {
    this.isSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

    this.preparedUtterances = [];
    this.currentIndex = 0;

    //getVoices()는 호출할 때마다 배열을 새로 만들고, 브라우저에 따라 처음엔 빈 배열이었다가
    //voiceschanged 이후에 채워진다. 절마다 조회하면 한 장(최대 176절)에 176번이 되므로
    //한 번 찾아서 캐시하고, 목록이 아직 안 왔을 때만 다시 시도한다.
    let koVoice = null;
    let voiceResolved = false;

    const resolveVoice = () => {
        const voices = window.speechSynthesis.getVoices();

        if (!voices.length) return;   //아직 목록이 준비되지 않음

        koVoice = voices.find(v => v.lang === 'ko-KR' && v.name === '유나') || null;
        voiceResolved = true;
    }

    this.createSpeechUtterance = (index, text) => {
        if (!this.isSupported) return;

        const utterance = new SpeechSynthesisUtterance(text);

        utterance.lang = 'ko-KR';  // 한국어 설정
        utterance.rate = 1;  // 속도 설정 (1은 기본 속도)
        utterance.pitch = 1; // 음높이 설정
        utterance.volume = 1; // 볼륨 설정 (0~1)

        if (!voiceResolved) resolveVoice();

        //'유나'가 없으면 voice를 지정하지 않고 lang만 보고 브라우저가 고르게 둔다
        if (koVoice) utterance.voice = koVoice;

        // utterance.text = `${index}!, ${text}`;  // 텍스트 음성으로 추가
        utterance.text = `${text},`;  // 숫자 뺏음

        return utterance;
    }

    this.stopTTS = () => {
        if (!this.isSupported) return;
        window.speechSynthesis.cancel();
    }

    this.pushArray = (data) => {
        if (!this.isSupported) return;
        this.preparedUtterances.push(data);
    }

    this.initData = () => {
        if (!this.isSupported) return;

        this.preparedUtterances = [];
        this.currentIndex = 0;
    }

    //목록이 늦게 채워지는 브라우저에서 첫 재생 전에 미리 잡아둔다
    if (this.isSupported) {
        resolveVoice();
        window.speechSynthesis.addEventListener('voiceschanged', resolveVoice);
    }

    this.playTTS = (cb1, cb2) => {
        if (!this.isSupported) return;

        if (this.currentIndex >= this.preparedUtterances.length) {
            if (typeof cb1 === 'function') cb1();
            return;
        }

        const utterance = this.preparedUtterances[this.currentIndex];

        if (typeof cb2 === 'function') cb2(utterance);

        window.speechSynthesis.speak(utterance);

        utterance.onend = () => {
            this.currentIndex++;
            this.playTTS(cb1, cb2); // 다음 문장 재생
        };
    }
}