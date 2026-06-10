document.addEventListener('DOMContentLoaded', () => {
    const LESSON = window.LESSON || { name: 'Lesson', instructions: '', customColors: null, cards: [] };

    const {
        shuffleArray,
        normalizeAnswerText,
        describeCardContent,
        provideFeedback,
        stopCurrentAudio,
        playCardAudio,
        createPlayAudioButton
    } = window.FlashShared;

    const currentCards = Array.isArray(LESSON.cards) ? LESSON.cards : [];
    const currentSetCustomColors = LESSON.customColors || null;
    let flashcardReversed = false;
    let flashcardDeck = [];
    let memoryGameCardsArray = [];
    let memoryCardsRevealed = false;
    let memoryGameState = {
        firstCardFlipped: null,
        secondCardFlipped: null,
        lockBoard: false,
        matchedPairsCount: 0,
        totalPairsInGame: 0,
    };

    const CONFIG = {
        MEMORY_MATCH_AUDIO_DELAY_MS: 300,
        MEMORY_UNFLIP_DELAY_MS: 1200,
    };

    const flashcardTabButton = document.getElementById('flashcardTabButton');
    const memoryGameTabButton = document.getElementById('memoryGameTabButton');
    const flashcardTab = document.getElementById('flashcardTab');
    const memoryGameTab = document.getElementById('memoryGameTab');

    const flashcardInstructionsDisplay = document.getElementById('flashcardInstructionsDisplay');
    const studyCardCountDisplay = document.getElementById('studyCardCountDisplay');
    const flipAllButton = document.getElementById('flipAllButton');
    const shuffleDeckButton = document.getElementById('shuffleDeckButton');
    const reverseFlashcardsToggle = document.getElementById('reverseFlashcardsToggle');
    const studyModeSelect = document.getElementById('studyModeSelect');
    const flashcardContainer = document.getElementById('flashcardContainer');
    const flashcardEmptyMessage = flashcardContainer ? flashcardContainer.querySelector('.empty-message') : null;

    const memoryGameInstructionsDisplay = document.getElementById('memoryGameInstructionsDisplay');
    const memoryGameDifficultySelect = document.getElementById('memoryGameDifficulty');
    const memoryGameMatchTypeSelect = document.getElementById('memoryGameMatchType');
    const revealMemoryCardsButton = document.getElementById('revealMemoryCardsButton');
    const newMemoryGameButton = document.getElementById('newMemoryGameButton');
    const memoryGameFeedback = document.getElementById('memoryGameFeedback');
    const memoryGameContainer = document.getElementById('memoryGameContainer');
    const memoryGameEmptyMessage = memoryGameContainer ? memoryGameContainer.querySelector('.empty-message') : null;
    const memoryGameProgress = document.getElementById('memoryGameProgress');
    const currentYearSpan = document.getElementById('currentYear');

    const tabButtons = [flashcardTabButton, memoryGameTabButton].filter(Boolean);
    const tabPanels = [flashcardTab, memoryGameTab].filter(Boolean);


    function displayInstructions(tabType) {
        const displayElement = tabType === 'flashcard' ? flashcardInstructionsDisplay : memoryGameInstructionsDisplay;
        if (!displayElement) return;
        if (LESSON.instructions) {
            displayElement.textContent = LESSON.instructions;
            displayElement.style.display = 'block';
        } else {
            displayElement.textContent = '';
            displayElement.style.display = 'none';
        }
    }

    function updateStudyCardCount() {
        if (studyCardCountDisplay) {
            const n = currentCards.length;
            studyCardCountDisplay.textContent = `${n} card${n === 1 ? '' : 's'} ready to study.`;
        }
    }

    function updateMemoryGameProgressDisplay() {
        if (!memoryGameProgress) return;
        memoryGameProgress.textContent = `${memoryGameState.matchedPairsCount} of ${memoryGameState.totalPairsInGame} pairs found.`;
    }

    function getFlashcardVisibleSideDescription(isFlipped, studyMode, isReversed) {
        let frontContentDesc = "content";
        let backContentDesc = "content";
        switch (studyMode) {
            case 'image_text_audio': frontContentDesc = "image"; backContentDesc = "text"; break;
            case 'image_audio': frontContentDesc = "image"; backContentDesc = "audio"; break;
            case 'audio_text': frontContentDesc = "audio"; backContentDesc = "text"; break;
            case 'audio_only': return "audio";
        }
        if (isReversed) {
            return isFlipped ? frontContentDesc : backContentDesc;
        } else {
            return isFlipped ? backContentDesc : frontContentDesc;
        }
    }

    function updateFlashcardAriaLabel(cardElement, cardData, isFlipped, studyMode, isReversed) {
        const visibleSideDescription = getFlashcardVisibleSideDescription(isFlipped, studyMode, isReversed);
        cardElement.setAttribute('aria-label', `Flashcard for ${cardData.word}. Showing ${visibleSideDescription}. Press space or enter to flip.`);
    }

    function renderFlashcardView() {
        if (!flashcardContainer || !flipAllButton || !shuffleDeckButton) return;
        flashcardContainer.innerHTML = "";
        if (studyModeSelect) studyModeSelect.disabled = (currentCards.length === 0);
        displayInstructions('flashcard');

        if (currentCards.length === 0) {
            if (flashcardEmptyMessage) flashcardContainer.appendChild(flashcardEmptyMessage);
            flipAllButton.disabled = true;
            shuffleDeckButton.disabled = true;
            return;
        }
        flashcardDeck = shuffleArray([...currentCards]);
        _renderFlashcardDeck();
        flipAllButton.disabled = false;
        shuffleDeckButton.disabled = false;
    }

    function _renderFlashcardDeck() {
        if (!flashcardContainer) return;
        flashcardContainer.innerHTML = "";
        if (flashcardDeck.length === 0 && flashcardEmptyMessage) {
            flashcardContainer.appendChild(flashcardEmptyMessage);
            return;
        }
        flashcardDeck.forEach((cardData, index) => {
            flashcardContainer.appendChild(createFlashcardElement(cardData, `fc-${index}`));
        });
    }

    function createFlashcardElement(cardData, uniqueIdSuffix) {
        const currentStudyMode = studyModeSelect ? studyModeSelect.value : 'image_text_audio';
        const outerContainer = document.createElement('div');
        outerContainer.className = 'flashcard-outer-container';

        const card = document.createElement('div');
        card.className = 'flashcard';
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-roledescription', 'flashcard');
        card.dataset.cardId = cardData.id;

        if (currentSetCustomColors) {
            if (currentSetCustomColors.front) card.style.setProperty('--card-front-bg-override', currentSetCustomColors.front);
            if (currentSetCustomColors.back) card.style.setProperty('--card-back-bg-override', currentSetCustomColors.back);
        }

        const visualFrontFace = document.createElement('div');
        visualFrontFace.className = 'flashcard-front';
        const visualBackFace = document.createElement('div');
        visualBackFace.className = 'flashcard-back';

        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';
        if (cardData.imageDataUrl) {
            const img = document.createElement('img');
            img.src = cardData.imageDataUrl;
            img.alt = `Image for ${cardData.word}`;
            img.onerror = function() {
                this.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50"%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="8px" fill="%23666"%3EError%3C/text%3E%3C/svg%3E';
                this.alt = 'Image load error';
            };
            imageContainer.appendChild(img);
        } else {
            const noImagePlaceholder = document.createElement('span');
            noImagePlaceholder.className = 'placeholder-text';
            noImagePlaceholder.textContent = 'No Image Available';
            imageContainer.appendChild(noImagePlaceholder);
        }

        const wordDisplay = document.createElement('span');
        wordDisplay.className = 'word-display';
        wordDisplay.textContent = cardData.word;

        let playButtonForImageSide = null;
        let playButtonForWordSide = null;
        if (cardData.audioType !== 'none') {
            playButtonForImageSide = createPlayAudioButton(cardData, `audio-img-${uniqueIdSuffix}`, 'image side');
            playButtonForWordSide = createPlayAudioButton(cardData, `audio-word-${uniqueIdSuffix}`, 'word side');
        }

        let frontElements = [], backElements = [];
        let primaryContent = { image: imageContainer, text: wordDisplay, audio: playButtonForImageSide };
        let secondaryContent = { image: imageContainer, text: wordDisplay, audio: playButtonForWordSide };

        if (flashcardReversed) {
            primaryContent = { image: imageContainer, text: wordDisplay, audio: playButtonForWordSide };
            secondaryContent = { image: imageContainer, text: wordDisplay, audio: playButtonForImageSide };
            switch (currentStudyMode) {
                case 'image_text_audio':
                    frontElements.push(primaryContent.text);
                    if (primaryContent.audio) frontElements.push(primaryContent.audio);
                    backElements.push(secondaryContent.image);
                    if (secondaryContent.audio) backElements.push(secondaryContent.audio);
                    break;
                case 'image_audio':
                    if (primaryContent.audio) frontElements.push(primaryContent.audio); else frontElements.push(document.createTextNode("Audio"));
                    backElements.push(secondaryContent.image);
                    if (secondaryContent.audio) backElements.push(secondaryContent.audio);
                    break;
                case 'audio_text':
                    frontElements.push(primaryContent.text);
                    if (primaryContent.audio) frontElements.push(primaryContent.audio);
                    if (secondaryContent.audio) backElements.push(secondaryContent.audio); else backElements.push(document.createTextNode("Audio"));
                    break;
                case 'audio_only':
                    if (primaryContent.audio) frontElements.push(primaryContent.audio); else frontElements.push(document.createTextNode("Audio"));
                    if (secondaryContent.audio) backElements.push(secondaryContent.audio); else backElements.push(document.createTextNode("Audio"));
                    break;
            }
        } else {
            switch (currentStudyMode) {
                case 'image_text_audio':
                    frontElements.push(primaryContent.image);
                    if (primaryContent.audio) frontElements.push(primaryContent.audio);
                    backElements.push(secondaryContent.text);
                    if (secondaryContent.audio) backElements.push(secondaryContent.audio);
                    break;
                case 'image_audio':
                    frontElements.push(primaryContent.image);
                    if (primaryContent.audio) frontElements.push(primaryContent.audio);
                    if (secondaryContent.audio) backElements.push(secondaryContent.audio); else backElements.push(document.createTextNode("Audio"));
                    break;
                case 'audio_text':
                    if (primaryContent.audio) frontElements.push(primaryContent.audio); else frontElements.push(document.createTextNode("Audio"));
                    backElements.push(secondaryContent.text);
                    if (secondaryContent.audio) backElements.push(secondaryContent.audio);
                    break;
                case 'audio_only':
                    if (primaryContent.audio) frontElements.push(primaryContent.audio); else frontElements.push(document.createTextNode("Audio"));
                    if (secondaryContent.audio) backElements.push(secondaryContent.audio); else backElements.push(document.createTextNode("Audio"));
                    break;
            }
        }
        updateFlashcardAriaLabel(card, cardData, false, currentStudyMode, flashcardReversed);

        frontElements.forEach(el => visualFrontFace.appendChild(el));
        backElements.forEach(el => visualBackFace.appendChild(el));
        card.appendChild(visualFrontFace);
        card.appendChild(visualBackFace);

        const flipCard = () => {
            stopCurrentAudio();
            card.classList.toggle('is-flipped');
            const isFlipped = card.classList.contains('is-flipped');
            updateFlashcardAriaLabel(card, cardData, isFlipped, currentStudyMode, flashcardReversed);
        };
        card.addEventListener('click', flipCard);
        card.addEventListener('keydown', (e) => {
            if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flipCard(); }
        });

        outerContainer.appendChild(card);
        return outerContainer;
    }

    function flipAllFlashcards() {
        if (!flashcardContainer) return;
        const flashcards = flashcardContainer.querySelectorAll('.flashcard');
        const currentStudyMode = studyModeSelect ? studyModeSelect.value : 'image_text_audio';
        flashcards.forEach(cardElement => {
            const cardId = cardElement.dataset.cardId;
            const cardData = flashcardDeck.find(c => c.id === cardId);
            cardElement.classList.toggle('is-flipped');
            if (cardData) {
                const isFlipped = cardElement.classList.contains('is-flipped');
                updateFlashcardAriaLabel(cardElement, cardData, isFlipped, currentStudyMode, flashcardReversed);
            }
        });
    }

    function shuffleAndRenderFlashcards() {
        flashcardDeck = shuffleArray([...currentCards]);
        _renderFlashcardDeck();
    }

    function toggleReverseFlashcards() {
        if (reverseFlashcardsToggle) flashcardReversed = reverseFlashcardsToggle.checked;
        renderFlashcardView();
    }

    function updateMemoryCardAriaLabel(cardElement, cardData, state = 'face-down') {
        if (!cardElement || !cardData) return;
        if (cardData.variant === 'audio' && state !== 'matched') {
            if (state === 'face-down') {
                cardElement.setAttribute('aria-label', 'Memory card face down. Press space or enter to reveal a sound card.');
            } else {
                cardElement.setAttribute('aria-label', 'Memory card face up: sound only. Listen and find the matching picture.');
            }
            return;
        }
        const humanDescription = describeCardContent(cardData);
        if (state === 'matched') { cardElement.setAttribute('aria-label', `Matched memory card: ${humanDescription}.`); return; }
        if (state === 'revealed') { cardElement.setAttribute('aria-label', `Revealed memory card: ${humanDescription}.`); return; }
        if (state === 'face-up') { cardElement.setAttribute('aria-label', `Memory card face up: ${humanDescription}.`); return; }
        cardElement.setAttribute('aria-label', `Memory card face down. Press space or enter to reveal ${cardData.word}.`);
    }

    function startNewMemoryGame() {
        if (!memoryGameContainer || !newMemoryGameButton || !memoryGameFeedback || !memoryGameDifficultySelect) return;
        memoryGameContainer.innerHTML = "";
        displayInstructions('memoryGame');
        provideFeedback(memoryGameFeedback, "", "info");

        if (currentCards.length < 2) {
            memoryGameState.matchedPairsCount = 0;
            memoryGameState.totalPairsInGame = 0;
            updateMemoryGameProgressDisplay();
            if (memoryGameEmptyMessage) memoryGameContainer.appendChild(memoryGameEmptyMessage);
            newMemoryGameButton.textContent = "New Game / Shuffle";
            newMemoryGameButton.disabled = true;
            memoryGameDifficultySelect.disabled = true;
            if (revealMemoryCardsButton) revealMemoryCardsButton.disabled = true;
            return;
        }
        newMemoryGameButton.disabled = false;
        memoryGameDifficultySelect.disabled = false;
        newMemoryGameButton.textContent = "New Game / Shuffle";

        const matchType = memoryGameMatchTypeSelect ? memoryGameMatchTypeSelect.value : 'identical';
        let pairPool = currentCards;
        if (matchType === 'image_audio') {
            pairPool = currentCards.filter(card => card.imageDataUrl && card.audioType === 'file' && card.audioDataUrl);
            if (pairPool.length < 2) {
                memoryGameState.matchedPairsCount = 0;
                memoryGameState.totalPairsInGame = 0;
                memoryGameCardsArray = [];
                updateMemoryGameProgressDisplay();
                provideFeedback(memoryGameFeedback, `Image + Sound mode needs at least 2 cards with both an image and an audio file. Only ${pairPool.length} card${pairPool.length === 1 ? '' : 's'} in this set qualif${pairPool.length === 1 ? 'ies' : 'y'}.`, "error");
                if (revealMemoryCardsButton) revealMemoryCardsButton.disabled = true;
                return;
            }
        }

        let numPairsToUse;
        const difficulty = memoryGameDifficultySelect.value;
        if (difficulty === "all") numPairsToUse = pairPool.length;
        else numPairsToUse = parseInt(difficulty, 10);
        numPairsToUse = Math.max(2, Math.min(numPairsToUse, pairPool.length));
        if (pairPool.length < numPairsToUse && difficulty !== "all") {
            provideFeedback(memoryGameFeedback, `Not enough unique cards for ${numPairsToUse} pairs. Using all ${pairPool.length} available pairs.`, "warning");
            numPairsToUse = pairPool.length;
        }

        memoryGameState = {
            firstCardFlipped: null,
            secondCardFlipped: null,
            lockBoard: false,
            matchedPairsCount: 0,
            totalPairsInGame: numPairsToUse
        };

        const cardsForThisGame = shuffleArray([...pairPool]).slice(0, numPairsToUse);
        memoryGameCardsArray = [];
        cardsForThisGame.forEach(card => {
            const firstVariant = matchType === 'image_audio' ? 'image' : 'full';
            const secondVariant = matchType === 'image_audio' ? 'audio' : 'full';
            memoryGameCardsArray.push({ ...card, uniqueGameId: card.id + '_copy1', matchId: card.id, variant: firstVariant });
            memoryGameCardsArray.push({ ...card, uniqueGameId: card.id + '_copy2', matchId: card.id, variant: secondVariant });
        });
        memoryGameCardsArray = shuffleArray(memoryGameCardsArray);

        memoryCardsRevealed = false;
        renderMemoryGameView();
        updateMemoryGameProgressDisplay();
        if (revealMemoryCardsButton) {
            revealMemoryCardsButton.disabled = (memoryGameCardsArray.length === 0);
            revealMemoryCardsButton.textContent = "Reveal All Cards";
        }
    }

    function renderMemoryGameView() {
        if (!memoryGameContainer) return;
        memoryGameContainer.innerHTML = "";
        if (memoryGameCardsArray.length === 0 && memoryGameEmptyMessage) {
            memoryGameContainer.appendChild(memoryGameEmptyMessage);
            return;
        }
        memoryGameCardsArray.forEach((cardData, index) => {
            memoryGameContainer.appendChild(createMemoryCardElement(cardData, `mg-${index}`));
        });
    }

    function createMemoryCardElement(cardData, uniqueIdSuffix) {
        const outerContainer = document.createElement('div');
        outerContainer.className = 'memory-card-container';

        const card = document.createElement('div');
        card.className = 'memory-card';
        card.dataset.matchId = cardData.matchId;
        card.dataset.uniqueGameId = cardData.uniqueGameId;
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-roledescription', 'memory card');
        updateMemoryCardAriaLabel(card, cardData, 'face-down');

        if (currentSetCustomColors) {
            if (currentSetCustomColors.front) card.style.setProperty('--card-front-bg-override', currentSetCustomColors.front);
            if (currentSetCustomColors.back) card.style.setProperty('--card-back-bg-override', currentSetCustomColors.back);
        }

        const front = document.createElement('div');
        front.className = 'flashcard-front';

        if (cardData.variant === 'audio') {
            const audioFace = document.createElement('div');
            audioFace.className = 'image-container';
            const symbol = document.createElement('span');
            symbol.className = 'audio-only-symbol';
            symbol.textContent = '🔊';
            symbol.setAttribute('aria-hidden', 'true');
            audioFace.appendChild(symbol);
            front.appendChild(audioFace);

            const bottomContent = document.createElement('div');
            bottomContent.className = 'bottom-content';
            const playButton = createPlayAudioButton({ ...cardData, word: 'this sound card' }, `audio-mem-${uniqueIdSuffix}`, 'face');
            bottomContent.appendChild(playButton);
            front.appendChild(bottomContent);
        } else {
            const imageContainer = document.createElement('div');
            imageContainer.className = 'image-container';
            if (cardData.imageDataUrl) {
                const img = document.createElement('img');
                img.src = cardData.imageDataUrl;
                img.alt = `Image of ${cardData.word}`;
                img.onerror = function() {
                    this.src = 'data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50"%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="8px" fill="%23666"%3EError%3C/text%3E%3C/svg%3E';
                    this.alt = 'Image load error';
                };
                imageContainer.appendChild(img);
            } else {
                const noImagePlaceholder = document.createElement('span');
                noImagePlaceholder.className = 'placeholder-text';
                noImagePlaceholder.textContent = 'No Img';
                imageContainer.appendChild(noImagePlaceholder);
            }
            front.appendChild(imageContainer);

            const bottomContent = document.createElement('div');
            bottomContent.className = 'bottom-content';
            if (!cardData.imageDataUrl) {
                const wordLabel = document.createElement('span');
                wordLabel.className = 'word-label';
                wordLabel.textContent = cardData.word;
                bottomContent.appendChild(wordLabel);
            }
            if (cardData.audioType !== 'none' && cardData.variant !== 'image') {
                const playButton = createPlayAudioButton(cardData, `audio-mem-${uniqueIdSuffix}`, 'face');
                bottomContent.appendChild(playButton);
            }
            front.appendChild(bottomContent);
        }

        const back = document.createElement('div');
        back.className = 'flashcard-back';
        const backSymbol = document.createElement('span');
        backSymbol.textContent = '?';
        back.setAttribute('aria-hidden', 'true');
        back.appendChild(backSymbol);

        card.appendChild(front);
        card.appendChild(back);

        card.addEventListener('click', handleMemoryCardClick);
        card.addEventListener('keydown', (e) => {
            if ((e.key === ' ' || e.key === 'Enter') && !card.classList.contains('is-flipped') && !card.classList.contains('matched') && !memoryGameState.lockBoard) {
                e.preventDefault();
                handleMemoryCardClick({ currentTarget: card });
            }
        });

        outerContainer.appendChild(card);
        return outerContainer;
    }

    function handleMemoryCardClick(event) {
        const clickedCard = event.currentTarget;
        if (memoryCardsRevealed) return;
        const cardData = memoryGameCardsArray.find(c => c.uniqueGameId === clickedCard.dataset.uniqueGameId);
        if (memoryGameState.lockBoard || clickedCard.classList.contains('matched') || clickedCard === memoryGameState.firstCardFlipped || !cardData) return;

        stopCurrentAudio(); // No audio stacking when another card is clicked

        clickedCard.classList.add('is-flipped');
        updateMemoryCardAriaLabel(clickedCard, cardData, 'face-up');

        if (cardData.variant === 'audio') {
            playCardAudio(cardData, () => {}, (err) => console.error(`Sound card audio error: ${err}`));
        }

        if (!memoryGameState.firstCardFlipped) {
            memoryGameState.firstCardFlipped = clickedCard;
            return;
        }
        memoryGameState.secondCardFlipped = clickedCard;
        memoryGameState.lockBoard = true;
        checkForMatch();
    }

    function checkForMatch() {
        const isMatch = memoryGameState.firstCardFlipped.dataset.matchId === memoryGameState.secondCardFlipped.dataset.matchId;
        if (isMatch) disableMatchedMemoryCards();
        else unflipMismatchedMemoryCards();
    }

    function disableMatchedMemoryCards() {
        const first = memoryGameState.firstCardFlipped;
        const second = memoryGameState.secondCardFlipped;
        first.classList.add('matched');
        second.classList.add('matched');

        const firstCardData = memoryGameCardsArray.find(c => c.uniqueGameId === first.dataset.uniqueGameId);
        const secondCardData = memoryGameCardsArray.find(c => c.uniqueGameId === second.dataset.uniqueGameId);
        updateMemoryCardAriaLabel(first, firstCardData, 'matched');
        updateMemoryCardAriaLabel(second, secondCardData, 'matched');
        first.setAttribute('tabindex', '-1');
        second.setAttribute('tabindex', '-1');

        const cardDataForAudio = currentCards.find(c => c.id === first.dataset.matchId);
        if (cardDataForAudio && cardDataForAudio.audioType !== 'none') {
            setTimeout(() => {
                playCardAudio(cardDataForAudio, () => {}, (err) => console.error(`Match audio error: ${err}`));
            }, CONFIG.MEMORY_MATCH_AUDIO_DELAY_MS);
        }

        memoryGameState.matchedPairsCount++;
        updateMemoryGameProgressDisplay();
        resetMemoryGameBoardTurnState();
        if (memoryGameState.matchedPairsCount === memoryGameState.totalPairsInGame) {
            provideFeedback(memoryGameFeedback, `Congratulations! You found all ${memoryGameState.totalPairsInGame} pairs!`, "success");
            if (newMemoryGameButton) newMemoryGameButton.textContent = "Play Again?";
        }
    }

    function unflipMismatchedMemoryCards() {
        setTimeout(() => {
            const first = memoryGameState.firstCardFlipped;
            const second = memoryGameState.secondCardFlipped;
            if (first) {
                first.classList.remove('is-flipped');
                updateMemoryCardAriaLabel(first, memoryGameCardsArray.find(c => c.uniqueGameId === first.dataset.uniqueGameId), 'face-down');
            }
            if (second) {
                second.classList.remove('is-flipped');
                updateMemoryCardAriaLabel(second, memoryGameCardsArray.find(c => c.uniqueGameId === second.dataset.uniqueGameId), 'face-down');
            }
            resetMemoryGameBoardTurnState();
        }, CONFIG.MEMORY_UNFLIP_DELAY_MS);
    }

    function handleRevealMemoryCards() {
        if (memoryGameCardsArray.length === 0 || !memoryGameContainer) {
            provideFeedback(memoryGameFeedback, "Cannot reveal cards now or no game active.", "warning");
            return;
        }
        const memoryCards = memoryGameContainer.querySelectorAll('.memory-card');
        if (!memoryCardsRevealed) {
            if (memoryGameState.firstCardFlipped && !memoryGameState.secondCardFlipped) {
                provideFeedback(memoryGameFeedback, "Finish your current turn before revealing all cards.", "info");
                return;
            }
            memoryCardsRevealed = true;
            memoryGameState.lockBoard = true;
            if (revealMemoryCardsButton) revealMemoryCardsButton.textContent = "Hide All Cards";
            if (newMemoryGameButton) newMemoryGameButton.disabled = true;
            memoryCards.forEach(card => {
                if (!card.classList.contains('matched')) {
                    card.classList.add('is-flipped');
                    const cardData = memoryGameCardsArray.find(c => c.uniqueGameId === card.dataset.uniqueGameId);
                    updateMemoryCardAriaLabel(card, cardData, 'revealed');
                }
            });
            provideFeedback(memoryGameFeedback, "All non-matched cards revealed. Click 'Hide All Cards' to resume.", "info");
        } else {
            memoryCardsRevealed = false;
            memoryGameState.lockBoard = false;
            if (revealMemoryCardsButton) revealMemoryCardsButton.textContent = "Reveal All Cards";
            if (newMemoryGameButton) newMemoryGameButton.disabled = false;
            memoryCards.forEach(card => {
                if (!card.classList.contains('matched')) {
                    card.classList.remove('is-flipped');
                    const cardData = memoryGameCardsArray.find(c => c.uniqueGameId === card.dataset.uniqueGameId);
                    updateMemoryCardAriaLabel(card, cardData, 'face-down');
                }
            });
            provideFeedback(memoryGameFeedback, "Cards hidden. Resume playing!", "info");
        }
    }

    function resetMemoryGameBoardTurnState() {
        memoryGameState.firstCardFlipped = null;
        memoryGameState.secondCardFlipped = null;
        memoryGameState.lockBoard = false;
    }

    function switchTab(tabIdToActivate) {
        stopCurrentAudio();
        tabPanels.forEach(tab => {
            tab.classList.remove('active');
            tab.setAttribute('aria-hidden', 'true');
            tab.hidden = true;
        });
        tabButtons.forEach(button => {
            button.classList.remove('active');
            button.setAttribute('aria-selected', 'false');
            button.setAttribute('tabindex', '-1');
        });
        const tabToShow = document.getElementById(tabIdToActivate);
        const buttonToActivate = document.getElementById(tabIdToActivate + 'Button');
        if (tabToShow) {
            tabToShow.classList.add('active');
            tabToShow.setAttribute('aria-hidden', 'false');
            tabToShow.hidden = false;
            if (tabIdToActivate === 'flashcardTab') renderFlashcardView();
            if (tabIdToActivate === 'memoryGameTab') startNewMemoryGame();
        }
        if (buttonToActivate) {
            buttonToActivate.classList.add('active');
            buttonToActivate.setAttribute('aria-selected', 'true');
            buttonToActivate.setAttribute('tabindex', '0');
        }
    }

    function init() {
        if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();

        if (flashcardTabButton) flashcardTabButton.addEventListener('click', () => switchTab('flashcardTab'));
        if (memoryGameTabButton) memoryGameTabButton.addEventListener('click', () => switchTab('memoryGameTab'));
        tabButtons.forEach((button) => {
            button.addEventListener('keydown', (event) => {
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); focusAdjacentTab(button, 1); }
                else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); focusAdjacentTab(button, -1); }
                else if ((event.key === ' ' || event.key === 'Enter') && !button.disabled) { event.preventDefault(); button.click(); }
            });
        });

        if (flipAllButton) flipAllButton.addEventListener('click', flipAllFlashcards);
        if (shuffleDeckButton) shuffleDeckButton.addEventListener('click', shuffleAndRenderFlashcards);
        if (reverseFlashcardsToggle) reverseFlashcardsToggle.addEventListener('change', toggleReverseFlashcards);
        if (studyModeSelect) studyModeSelect.addEventListener('change', renderFlashcardView);
        if (newMemoryGameButton) newMemoryGameButton.addEventListener('click', startNewMemoryGame);
        if (revealMemoryCardsButton) revealMemoryCardsButton.addEventListener('click', handleRevealMemoryCards);
        if (memoryGameDifficultySelect) memoryGameDifficultySelect.addEventListener('change', startNewMemoryGame);
        if (memoryGameMatchTypeSelect) memoryGameMatchTypeSelect.addEventListener('change', startNewMemoryGame);

        if (memoryGameTabButton) memoryGameTabButton.disabled = currentCards.length < 2;

        updateStudyCardCount();
        updateMemoryGameProgressDisplay();
        renderFlashcardView();
    }

    function focusAdjacentTab(currentButton, direction) {
        const currentIndex = tabButtons.indexOf(currentButton);
        if (currentIndex === -1) return;
        let nextIndex = currentIndex;
        const totalTabs = tabButtons.length;
        do {
            nextIndex = (nextIndex + direction + totalTabs) % totalTabs;
        } while (tabButtons[nextIndex].disabled && nextIndex !== currentIndex);
        const nextButton = tabButtons[nextIndex];
        if (nextButton && !nextButton.disabled) nextButton.focus();
    }

    init();
});
