function TTS(){
    this.isSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

    this.preparedUtterances = [];
    this.currentIndex = 0;

    this.createSpeechUtterance = (index, text) => {
        if(!this.isSupported) return;

        const utterance = new SpeechSynthesisUtterance(text);
    
        utterance.lang = 'ko-KR';  // 한국어 설정
        utterance.rate = 1;  // 속도 설정 (1은 기본 속도)
        utterance.pitch = 1; // 음높이 설정
        utterance.volume = 1; // 볼륨 설정 (0~1)
    
        const voices = window.speechSynthesis.getVoices();
        const koreanVoices = voices.filter(voice => voice.lang === 'ko-KR');
    
        const yuna = koreanVoices.length ? koreanVoices.find(v => v.name === '유나') : '';
    
        if(yuna !== '') utterance.voice = yuna;
    
    
        utterance.text = `${index}!, ${text}`;  // 텍스트 음성으로 추가
    
        return utterance;
    }

    this.stopTTS = () => {
        if(!this.isSupported) return;
        window.speechSynthesis.cancel();
    }

    this.pushArray = (data) => {
        if(!this.isSupported) return;
        this.preparedUtterances.push(data);
    }

    this.initData = () => {
        if(!this.isSupported) return;

        this.preparedUtterances = [];
        this.currentIndex = 0;
    }

    this.playTTS = (cb1, cb2) => {
        if(!this.isSupported) return;

        if (this.currentIndex >= this.preparedUtterances.length) {
            if(typeof cb1 === 'function') cb1();
            return;
        }

        const utterance = this.preparedUtterances[this.currentIndex];

        if(typeof cb2 === 'function') cb2(utterance);

        window.speechSynthesis.speak(utterance);

        utterance.onend = () => {
            this.currentIndex++;
            this.playTTS(cb1, cb2); // 다음 문장 재생
        };
    }
}