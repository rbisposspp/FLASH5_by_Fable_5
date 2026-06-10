// Shared study/memory helpers used by both the authoring app (script.js)
// and the player runtime (player/player.js). Bundled into every exported lesson ZIP.
window.FlashShared = (() => {
    let currentAudio = null; // The Audio element currently playing, so it can be stopped
    let isSpeaking = false;  // To prevent concurrent audio playback

    function shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    function normalizeAnswerText(value) {
        return (value || "")
            .trim()
            .toLowerCase()
            .replace(/[.,!?;:]/g, '');
    }

    function describeCardContent(cardData) {
        const normalizedWord = normalizeAnswerText(cardData.word) || 'untitled card';
        const label = normalizedWord === 'untitled card' ? normalizedWord : cardData.word;
        const descriptionParts = [label];
        if (cardData.imageDataUrl) descriptionParts.push('image');
        else descriptionParts.push('text label');
        if (cardData.audioType !== 'none') descriptionParts.push('audio');
        return descriptionParts.join(', ');
    }

    function provideFeedback(element, message, type = 'info') {
        if (!element) return;
        element.textContent = message;
        element.className = `feedback-message ${type}`;
        element.style.display = message ? 'block' : 'none';
    }

    function stopCurrentAudio() {
        if (currentAudio) {
            currentAudio.onended = null;
            currentAudio.onerror = null;
            try { currentAudio.pause(); currentAudio.currentTime = 0; } catch (e) { /* ignore */ }
            currentAudio = null;
        }
        isSpeaking = false;
    }

    async function playCardAudio(cardData, onEndCallback, onErrorCallback) {
        stopCurrentAudio(); // Never stack audio: stop whatever is playing first

        if (cardData.audioType === 'file' && cardData.audioDataUrl) {
            const audioElement = new Audio(cardData.audioDataUrl);
            currentAudio = audioElement;
            isSpeaking = true;
            audioElement.onended = () => {
                if (currentAudio === audioElement) { currentAudio = null; isSpeaking = false; }
                if (onEndCallback) onEndCallback();
            };
            audioElement.onerror = (e) => {
                if (currentAudio === audioElement) { currentAudio = null; isSpeaking = false; }
                console.error("Error playing audio:", e);
                if (onErrorCallback) onErrorCallback("Error playing audio.");
            };
            try {
                await audioElement.play();
            } catch (e) {
                if (currentAudio === audioElement) { currentAudio = null; isSpeaking = false; }
                if (e && e.name === 'AbortError') return; // playback replaced by a newer one — intentional, not an error
                console.error("Error initiating audio play:", e);
                if (onErrorCallback) onErrorCallback("Error initiating audio play.");
            }
        } else if (onEndCallback) {
            onEndCallback(); // No audio to play
        }
    }

    function createPlayAudioButton(cardData, audioIdBase, cardFaceType = '') {
        const button = document.createElement('button');
        button.className = 'play-audio-button';
        button.innerHTML = '🔊<span class="visually-hidden">Play audio</span>';
        button.title = `Play audio for ${cardData.word}`;
        button.setAttribute('aria-label', `Play audio for ${cardData.word} (${cardFaceType} of card)`);
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            playCardAudio(cardData,
                () => {},
                (err) => console.error(`Audio error for "${cardData.word}" (${cardFaceType}): ${err}`)
            );
        });
        return button;
    }

    return {
        shuffleArray,
        normalizeAnswerText,
        describeCardContent,
        provideFeedback,
        stopCurrentAudio,
        playCardAudio,
        createPlayAudioButton
    };
})();
