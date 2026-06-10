// script.js

// --- CUSTOMIZATION GUIDANCE FOR TEACHERS (JavaScript) ---
// - Generally, teachers should not need to modify this file unless they are comfortable with JavaScript.
// - Most customizable text content is in the HTML (index.html) or managed through the app's UI.
// - Default messages for empty states or feedback *could* be changed here if not configurable via UI,
//   but it's preferable to manage these in the HTML or through UI settings where possible.
// - Advanced: If specific game logic needs minor tweaks (e.g., flip delay in memory game),
//   those constants might be found and adjusted carefully.

document.addEventListener('DOMContentLoaded', () => {
    // --- Global State & Configuration ---
    const LOCAL_STORAGE_KEY = 'interactiveLearningToolCardSets_v3_audio_only';
    const BACKUP_STORAGE_KEY = 'interactiveLearningToolCardSets_backup';

    const {
        shuffleArray,
        normalizeAnswerText,
        describeCardContent,
        provideFeedback,
        stopCurrentAudio,
        playCardAudio,
        createPlayAudioButton
    } = window.FlashShared;

    let cardSets = {};
    let activeSetName = null;
    let currentCards = [];
    let currentInstructions = "";
    let editingCardId = null; // For tracking the card being edited
    let currentSetCustomColors = null; // For custom card colors per set
    let flashcardReversed = false; // For flashcard reverse mode

    // Memory Game State
    let memoryGameState = {
        firstCardFlipped: null,
        secondCardFlipped: null,
        lockBoard: false,
        matchedPairsCount: 0,
        totalPairsInGame: 0,
    };
    let memoryCardsRevealed = false; // Tracks if cards are globally revealed by the button

    const CONFIG = {
        MEMORY_MATCH_AUDIO_DELAY_MS: 300,
        MEMORY_UNFLIP_DELAY_MS: 1200,
        // Image processing config for storage optimization
        MAX_IMAGE_WIDTH: 800,   // Max width for resized images (pixels)
        MAX_IMAGE_HEIGHT: 800,  // Max height for resized images (pixels)
        IMAGE_COMPRESSION_QUALITY: 0.8, // JPEG quality (0.1 to 1.0, 1.0 being highest)
        // File size warning thresholds (original file size, before processing)
        MAX_IMAGE_FILE_SIZE_FOR_WARNING_BYTES: 1.5 * 1024 * 1024, // 1.5 MB original size
        MAX_AUDIO_FILE_SIZE_FOR_WARNING_BYTES: 2 * 1024 * 1024, // 2 MB original size
        LOCAL_STORAGE_APPROX_LIMIT_MB: 5 // Informational for error message
    };

    // --- DOM Elements ---
    const creatorTabButton = document.getElementById('creatorTabButton');
    const flashcardTabButton = document.getElementById('flashcardTabButton');
    const memoryGameTabButton = document.getElementById('memoryGameTabButton');
    const creatorTab = document.getElementById('creatorTab');
    const flashcardTab = document.getElementById('flashcardTab');
    const memoryGameTab = document.getElementById('memoryGameTab');
    const renameSetButton = document.getElementById('renameSetButton'); // Added

    const newSetNameInput = document.getElementById('newSetName');
    const createNewSetButton = document.getElementById('createNewSetButton');
    const cardSetSelect = document.getElementById('cardSetSelect');
    const loadSetButton = document.getElementById('loadSetButton');
    const saveSetButton = document.getElementById('saveSetButton');
    const deleteSetButton = document.getElementById('deleteSetButton');
    const saveLessonButton = document.getElementById('saveLessonButton');
    const exportSetButton = document.getElementById('exportSetButton');
    const importSetButton = document.getElementById('importSetButton');
    const importSetFile = document.getElementById('importSetFile');
    const clearAllSetsButton = document.getElementById('clearAllSetsButton'); // Added
    const cardFrontColorInput = document.getElementById('cardFrontColor');
    const cardBackColorInput = document.getElementById('cardBackColor');
    const setManagementFeedback = document.getElementById('setManagementFeedback');
    const currentSetNameDisplay = document.getElementById('currentSetNameDisplay');

    const editingCardIdInput = document.getElementById('editingCardIdInput');
    const imageInput = document.getElementById('imageInput');
    const currentImagePreview = document.getElementById('currentImagePreview');
    const currentImageFilename = document.getElementById('currentImageFilename');
    const clearImageButton = document.getElementById('clearImageButton');
    const wordInput = document.getElementById('wordInput');
    const audioInput = document.getElementById('audioInput');
    const currentAudioFilename = document.getElementById('currentAudioFilename');
    const clearAudioButton = document.getElementById('clearAudioButton');
    const currentAudioPreview = document.getElementById('currentAudioPreview');
    const addOrUpdateCardButton = document.getElementById('addOrUpdateCardButton');
    const cardCreationFeedback = document.getElementById('cardCreationFeedback');

    const setInstructionsInput = document.getElementById('setInstructionsInput');
    const createdCardsListDiv = document.getElementById('createdCardsList');
    const noCardsInSetMessage = document.getElementById('noCardsInSetMessage');
    const setCardCountDisplay = document.getElementById('setCardCountDisplay');

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

    const activeSetDisplayElements = document.querySelectorAll('.activeSetDisplay');
    const currentYearSpan = document.getElementById('currentYear');

    const tabButtons = [creatorTabButton, flashcardTabButton, memoryGameTabButton].filter(Boolean);
    const tabPanels = [creatorTab, flashcardTab, memoryGameTab].filter(Boolean);

    function updateStudyAndGameTabAvailability() {
        const hasEnoughCardsForFlashcards = activeSetName && currentCards.length > 0;
        const hasEnoughCardsForMemory = activeSetName && currentCards.length >= 2;

        if (flashcardTabButton) {
            flashcardTabButton.disabled = !hasEnoughCardsForFlashcards;
            flashcardTabButton.setAttribute('aria-disabled', String(!hasEnoughCardsForFlashcards));
        }
        if (memoryGameTabButton) {
            memoryGameTabButton.disabled = !hasEnoughCardsForMemory;
            memoryGameTabButton.setAttribute('aria-disabled', String(!hasEnoughCardsForMemory));
        }
    }
    // Then call this function in places like loadSet, handleAddOrUpdateCard, handleDeleteCardFromList.

    function setElementHidden(element, shouldHide) {
        if (!element) return;
        element.hidden = shouldHide;
        element.classList.toggle('hidden', shouldHide);
    }

    function updateImagePreview(src, labelText, altText) {
        if (!currentImagePreview || !currentImageFilename || !clearImageButton) return;
        const hasImage = Boolean(src);
        currentImagePreview.src = hasImage ? src : "";
        currentImagePreview.alt = hasImage ? (altText || "Selected image preview") : "";
        currentImageFilename.textContent = labelText || "";
        setElementHidden(currentImagePreview, !hasImage);
        setElementHidden(clearImageButton, !hasImage);
    }

    function updateAudioPreview(src, labelText) {
        if (currentAudioFilename) currentAudioFilename.textContent = labelText || "";
        if (currentAudioPreview) {
            currentAudioPreview.pause();
            currentAudioPreview.currentTime = 0;
            currentAudioPreview.src = src || "";
            if (src) currentAudioPreview.load();
            setElementHidden(currentAudioPreview, !src);
        }
        setElementHidden(clearAudioButton, !src);
    }

    function updateSetProgressDisplays() {
        const totalCards = currentCards.length;
        if (setCardCountDisplay) {
            setCardCountDisplay.textContent = `${totalCards} card${totalCards === 1 ? '' : 's'} in this set.`;
        }
        if (studyCardCountDisplay) {
            studyCardCountDisplay.textContent = `${totalCards} card${totalCards === 1 ? '' : 's'} ready to study.`;
        }
    }

    function updateMemoryGameProgressDisplay() {
        if (!memoryGameProgress) return;
        memoryGameProgress.textContent = `${memoryGameState.matchedPairsCount} of ${memoryGameState.totalPairsInGame} pairs found.`;
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
        if (state === 'matched') {
            cardElement.setAttribute('aria-label', `Matched memory card: ${humanDescription}.`);
            return;
        }
        if (state === 'revealed') {
            cardElement.setAttribute('aria-label', `Revealed memory card: ${humanDescription}.`);
            return;
        }
        if (state === 'face-up') {
            cardElement.setAttribute('aria-label', `Memory card face up: ${humanDescription}.`);
            return;
        }
        cardElement.setAttribute('aria-label', `Memory card face down. Press space or enter to reveal ${cardData.word}.`);
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
        if (nextButton) nextButton.focus();
    }

    function initializeApp() {
        console.log("Initializing Interactive Learning Tool v3 (local audio only)...");
        if (currentYearSpan) currentYearSpan.textContent = new Date().getFullYear();

        setupEventListeners();

        loadCardSetsFromLocalStorage();
        updateSetSelectorDropdown();

        if (Object.keys(cardSets).length > 0) {
            const firstSetName = Object.keys(cardSets)[0];
            if (firstSetName && cardSetSelect) cardSetSelect.value = firstSetName;
            loadSet(firstSetName);
        } else {
            displayActiveSetName();
            updateCreatorCardListView();
            if(setInstructionsInput) setInstructionsInput.value = "";
            applyDefaultCardColors();
            disableStudyAndGameTabs(true);
            updateSetActionButtonsState(false);
        }
        updateSetProgressDisplays();
        updateMemoryGameProgressDisplay();
        switchTab('creatorTab');
        console.log("App Initialized.");
    }

    function setupEventListeners() {
        if (creatorTabButton) creatorTabButton.addEventListener('click', () => switchTab('creatorTab'));
        if (flashcardTabButton) {
            flashcardTabButton.addEventListener('click', () => {
                if (activeSetName && currentCards.length > 0) switchTab('flashcardTab');
                else provideFeedback(setManagementFeedback, "Please load or create a set with cards first.", "info");
            });
        }
        if (memoryGameTabButton) {
            memoryGameTabButton.addEventListener('click', () => {
                if (activeSetName && currentCards.length >= 2) switchTab('memoryGameTab');
                else provideFeedback(setManagementFeedback, "Please load or create a set with at least 2 cards for the memory game.", "info");
            });
        }
        tabButtons.forEach((button, index) => {
            button.addEventListener('keydown', (event) => {
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                    event.preventDefault();
                    focusAdjacentTab(button, 1);
                } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                    event.preventDefault();
                    focusAdjacentTab(button, -1);
                } else if (event.key === 'Home') {
                    event.preventDefault();
                    tabButtons[0]?.focus();
                } else if (event.key === 'End') {
                    event.preventDefault();
                    tabButtons[tabButtons.length - 1]?.focus();
                } else if ((event.key === ' ' || event.key === 'Enter') && !button.disabled) {
                    event.preventDefault();
                    button.click();
                }
            });
            if (!button.id) {
                button.id = `tabButton${index}`;
            }
        });

        if (createNewSetButton) createNewSetButton.addEventListener('click', handleCreateNewSet);
        if (loadSetButton) loadSetButton.addEventListener('click', handleLoadSelectedSet);
        if (saveSetButton) saveSetButton.addEventListener('click', handleSaveCurrentSet);
        if (deleteSetButton) deleteSetButton.addEventListener('click', handleDeleteCurrentSet);
        if (saveLessonButton) saveLessonButton.addEventListener('click', handleSaveLesson);
        if (exportSetButton) exportSetButton.addEventListener('click', handleExportSet);
        if (importSetButton) importSetButton.addEventListener('click', () => importSetFile.click());
        if (renameSetButton) renameSetButton.addEventListener('click', handleRenameSet); // Added
        if (clearAllSetsButton) clearAllSetsButton.addEventListener('click', handleClearAllSets); // Added
        if (importSetFile) importSetFile.addEventListener('change', handleImportSetFileChange);

        if (setInstructionsInput) {
            setInstructionsInput.addEventListener('input', (e) => {
                if (activeSetName) {
                    currentInstructions = e.target.value;
                }
            });
        }

        if (addOrUpdateCardButton) addOrUpdateCardButton.addEventListener('click', handleAddOrUpdateCard);
        if (createdCardsListDiv) {
            createdCardsListDiv.addEventListener('click', (event) => {
                if (event.target.closest('.delete-card-btn')) {
                    handleDeleteCardFromList(event);
                } else if (event.target.closest('.edit-card-btn')) {
                    handleEditCardFromList(event);
                }
            });
        }

        if (clearImageButton) clearImageButton.addEventListener('click', handleClearImage);
        if (clearAudioButton) clearAudioButton.addEventListener('click', handleClearAudio);

        if (imageInput && clearImageButton) {
            imageInput.addEventListener('change', () => {
                const files = imageInput.files;
                if (files.length > 1) {
                    // Handle batch upload
                    handleBatchImageUpload(files);
                    updateImagePreview("", `${files.length} files selected for batch processing.`, "");
                    setElementHidden(clearImageButton, false);
                } else if (files.length === 1) {
                    // Handle single file upload (existing logic)
                    const file = files[0];
                    const previewUrl = URL.createObjectURL(file);
                    updateImagePreview(previewUrl, file.name, `Selected image for ${wordInput?.value?.trim() || 'current card'}`);
                    currentImagePreview.onload = () => URL.revokeObjectURL(previewUrl);
                    currentImagePreview.onerror = () => URL.revokeObjectURL(previewUrl);
                } else { // No files selected (e.g., after clearing)
                    updateImagePreview("", "", "");
                }
            });
        }
        if (audioInput && clearAudioButton) {
            audioInput.addEventListener('change', () => {
                const hasFile = audioInput.files.length > 0;
                if (hasFile) {
                    const file = audioInput.files[0];
                    const previewUrl = URL.createObjectURL(file);
                    updateAudioPreview(previewUrl, file.name);
                    if (currentAudioPreview) {
                        currentAudioPreview.onloadeddata = () => URL.revokeObjectURL(previewUrl);
                        currentAudioPreview.onerror = () => URL.revokeObjectURL(previewUrl);
                    }
                } else if (!editingCardId) {
                    updateAudioPreview("", "");
                }
            });
        }

        if (flipAllButton) flipAllButton.addEventListener('click', flipAllFlashcards);
        if (shuffleDeckButton) shuffleDeckButton.addEventListener('click', shuffleAndRenderFlashcards);
        if (reverseFlashcardsToggle) reverseFlashcardsToggle.addEventListener('change', toggleReverseFlashcards);
        if (studyModeSelect) studyModeSelect.addEventListener('change', renderFlashcardView); // Re-render on mode change

        if (newMemoryGameButton) newMemoryGameButton.addEventListener('click', startNewMemoryGame);
        if (revealMemoryCardsButton) revealMemoryCardsButton.addEventListener('click', handleRevealMemoryCards);
        if (memoryGameDifficultySelect) memoryGameDifficultySelect.addEventListener('change', startNewMemoryGame);
        if (memoryGameMatchTypeSelect) memoryGameMatchTypeSelect.addEventListener('change', startNewMemoryGame);

    }

    function switchTab(tabIdToActivate) {
        stopCurrentAudio();
        resetCardCreationForm();

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
            if (tabIdToActivate === 'flashcardTab' && activeSetName) renderFlashcardView();
            if (tabIdToActivate === 'memoryGameTab' && activeSetName) startNewMemoryGame();
        }
        if (buttonToActivate) {
            buttonToActivate.classList.add('active');
            buttonToActivate.setAttribute('aria-selected', 'true');
            buttonToActivate.setAttribute('tabindex', '0');
        }
    }
    function disableStudyAndGameTabs(isDisabled) {
        if (flashcardTabButton) {
            flashcardTabButton.disabled = isDisabled;
            flashcardTabButton.setAttribute('aria-disabled', String(isDisabled));
        }
        if (memoryGameTabButton) {
            memoryGameTabButton.disabled = isDisabled;
            memoryGameTabButton.setAttribute('aria-disabled', String(isDisabled));
        }
    }

    function updateSetActionButtonsState(isSetActive) {
        if (saveSetButton) saveSetButton.disabled = !isSetActive;
        if (deleteSetButton) deleteSetButton.disabled = !isSetActive;
        if (saveLessonButton) saveLessonButton.disabled = !isSetActive;
        if (exportSetButton) exportSetButton.disabled = !isSetActive;
        if (renameSetButton) renameSetButton.disabled = !isSetActive; // Added
        // clearAllSetsButton should be enabled if there are any sets.
    }

    function handleCreateNewSet() {
        if (!newSetNameInput || !setManagementFeedback || !cardSetSelect || !setInstructionsInput) return;
        resetCardCreationForm();

        const setName = newSetNameInput.value.trim();
        if (!setName) {
            provideFeedback(setManagementFeedback, "Please enter a name for the new set.", "error");
            return;
        }
        if (cardSets[setName]) {
            provideFeedback(setManagementFeedback, `A set named "${setName}" already exists. Choose a different name.`, "error");
            return;
        }
        activeSetName = setName;
        currentCards = [];
        currentInstructions = "";
        currentSetCustomColors = null; // Reset custom colors for new set
        applyDefaultCardColors();
        cardSets[activeSetName] = { cards: currentCards, instructions: currentInstructions };

        updateSetSelectorDropdown();
        if(cardSetSelect) cardSetSelect.value = activeSetName;
        displayActiveSetName();
        updateCreatorCardListView();
        updateSetProgressDisplays();
        if(setInstructionsInput) setInstructionsInput.value = "";
        if(newSetNameInput) newSetNameInput.value = "";
        provideFeedback(setManagementFeedback, `Set "${activeSetName}" created. Add cards and instructions, then save.`, "success");
        disableStudyAndGameTabs(true);
        updateSetActionButtonsState(true);
    }

    function handleLoadSelectedSet() {
        if (!cardSetSelect || !setManagementFeedback) return;
        resetCardCreationForm();
        const setName = cardSetSelect.value;
        if (setName && cardSets[setName]) {
            loadSet(setName);
        } else {
            provideFeedback(setManagementFeedback, "Please select a valid set to load.", "error");
        }
    }

    function loadSet(setName) {
        if (!setManagementFeedback || !setInstructionsInput) return;
        resetCardCreationForm();

        if (!cardSets[setName]) {
            provideFeedback(setManagementFeedback, `Set "${setName}" not found.`, "error");
            activeSetName = null;
            currentCards = [];
            currentInstructions = "";
            currentSetCustomColors = null;
            displayActiveSetName();
            updateCreatorCardListView();
            updateSetProgressDisplays();
            if(setInstructionsInput) setInstructionsInput.value = "";
            disableStudyAndGameTabs(true);
            updateSetActionButtonsState(false);
            return;
        }
        activeSetName = setName;
        const setData = cardSets[activeSetName];
        currentCards = setData.cards ? JSON.parse(JSON.stringify(setData.cards)) : []; // Deep copy
        currentInstructions = setData.instructions || "";
        currentSetCustomColors = setData.customColors || null;

        displayActiveSetName();
        updateCreatorCardListView();
        updateSetProgressDisplays();
        if(setInstructionsInput) setInstructionsInput.value = currentInstructions;
        provideFeedback(setManagementFeedback, `Set "${activeSetName}" loaded.`, "info");

        if (currentSetCustomColors) {
            if(cardFrontColorInput) cardFrontColorInput.value = currentSetCustomColors.front;
            if(cardBackColorInput) cardBackColorInput.value = currentSetCustomColors.back;
        } else {
            applyDefaultCardColors();
        }

        const hasEnoughCardsForFlashcards = currentCards.length > 0;
        const hasEnoughCardsForMemory = currentCards.length >= 2;
        disableStudyAndGameTabs(!hasEnoughCardsForFlashcards);
        if (memoryGameTabButton) memoryGameTabButton.disabled = !hasEnoughCardsForMemory;
        updateSetActionButtonsState(true);
    }

    function handleSaveCurrentSet() {
        if (!setManagementFeedback) return;
        if (!activeSetName) {
            provideFeedback(setManagementFeedback, "No active set to save. Please create or load a set first.", "error");
            return;
        }
        if (editingCardId) {
            provideFeedback(cardCreationFeedback, "Please finish editing the current card (Update or cancel by reloading set) before saving the set.", "warning");
            return;
        }

        const frontColor = cardFrontColorInput ? cardFrontColorInput.value : getComputedStyle(document.documentElement).getPropertyValue('--card-front-bg-default').trim();
        const backColor = cardBackColorInput ? cardBackColorInput.value : getComputedStyle(document.documentElement).getPropertyValue('--card-back-bg-default').trim();
        currentSetCustomColors = { front: frontColor, back: backColor };

        cardSets[activeSetName] = {
            cards: JSON.parse(JSON.stringify(currentCards)),
            instructions: currentInstructions,
            customColors: { ...currentSetCustomColors }
        };
        saveCardSetsToLocalStorage();
    }
    function handleDeleteCurrentSet() {
        if (!setManagementFeedback || !cardSetSelect || !setInstructionsInput) return;
        resetCardCreationForm();

        if (!activeSetName) {
            provideFeedback(setManagementFeedback, "No active set to delete.", "error");
            return;
        }
        if (confirm(`Are you sure you want to delete the set "${activeSetName}"? This cannot be undone.`)) {
            const deletedSetName = activeSetName;
            delete cardSets[activeSetName];

            activeSetName = null;
            currentCards = [];
            currentInstructions = "";
            currentSetCustomColors = null;

            saveCardSetsToLocalStorage(false);
            updateSetSelectorDropdown();

            const remainingSetNames = Object.keys(cardSets);
            if (remainingSetNames.length > 0) {
                if(cardSetSelect) cardSetSelect.value = remainingSetNames[0];
                loadSet(remainingSetNames[0]);
            } else {
                displayActiveSetName();
                updateCreatorCardListView();
                updateSetProgressDisplays();
                if(setInstructionsInput) setInstructionsInput.value = "";
                applyDefaultCardColors();
                disableStudyAndGameTabs(true);
                updateSetActionButtonsState(false);
            }
            provideFeedback(setManagementFeedback, `Set "${deletedSetName}" deleted.`, "info");
        }
    }

    // --- Save Lesson: bundle the playable Study + Memory tabs as a downloadable folder (ZIP) ---
    function sanitizeFolderName(name) {
        const cleaned = (name || 'lesson').replace(/[^a-z0-9 _-]/gi, '').replace(/\s+/g, ' ').trim();
        return cleaned || 'lesson';
    }

    function extensionForMime(mime) {
        const map = {
            'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/gif': 'gif',
            'image/webp': 'webp', 'image/svg+xml': 'svg', 'image/bmp': 'bmp',
            'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav',
            'audio/ogg': 'ogg', 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/x-m4a': 'm4a'
        };
        return map[(mime || '').toLowerCase()] || 'bin';
    }

    function dataUrlToBytes(dataUrl) {
        const comma = dataUrl.indexOf(',');
        if (comma === -1) return { bytes: new Uint8Array(0), mime: '' };
        const meta = dataUrl.substring(5, comma); // strip "data:"
        const mime = meta.split(';')[0];
        const isBase64 = /;base64/i.test(meta);
        const dataPart = dataUrl.substring(comma + 1);
        let bytes;
        if (isBase64) {
            const bin = atob(dataPart);
            bytes = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        } else {
            bytes = new TextEncoder().encode(decodeURIComponent(dataPart));
        }
        return { bytes, mime };
    }

    const CRC32_TABLE = (() => {
        const table = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
            table[n] = c >>> 0;
        }
        return table;
    })();

    function crc32(bytes) {
        let c = 0xFFFFFFFF;
        for (let i = 0; i < bytes.length; i++) c = CRC32_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
        return (c ^ 0xFFFFFFFF) >>> 0;
    }

    function buildZip(files) {
        // files: [{ path: string, bytes: Uint8Array }] — STORE method (no compression)
        const DOS_TIME = 0;
        const DOS_DATE = 0x21; // 1980-01-01, a valid DOS date
        const u16 = (n) => [n & 0xff, (n >>> 8) & 0xff];
        const u32 = (n) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];
        const encoder = new TextEncoder();

        const chunks = [];
        const central = [];
        let offset = 0;

        files.forEach(f => {
            const nameBytes = encoder.encode(f.path);
            const crc = crc32(f.bytes);
            const size = f.bytes.length;
            const localHeader = new Uint8Array([].concat(
                u32(0x04034b50), u16(20), u16(0), u16(0), u16(DOS_TIME), u16(DOS_DATE),
                u32(crc), u32(size), u32(size), u16(nameBytes.length), u16(0)
            ));
            chunks.push(localHeader, nameBytes, f.bytes);
            const centralHeader = new Uint8Array([].concat(
                u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(DOS_TIME), u16(DOS_DATE),
                u32(crc), u32(size), u32(size),
                u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset)
            ));
            central.push(centralHeader, nameBytes);
            offset += localHeader.length + nameBytes.length + size;
        });

        let centralSize = 0;
        central.forEach(c => centralSize += c.length);
        const eocd = new Uint8Array([].concat(
            u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
            u32(centralSize), u32(offset), u16(0)
        ));

        const all = chunks.concat(central, [eocd]);
        let total = 0;
        all.forEach(a => total += a.length);
        const out = new Uint8Array(total);
        let p = 0;
        all.forEach(a => { out.set(a, p); p += a.length; });
        return out;
    }

    async function handleSaveLesson() {
        if (!activeSetName || !cardSets[activeSetName]) {
            provideFeedback(setManagementFeedback, "No active set loaded to save.", "error");
            return;
        }
        if (editingCardId) {
            provideFeedback(cardCreationFeedback, "Please finish editing the current card before saving the lesson.", "warning");
            return;
        }

        const originalLabel = saveLessonButton ? saveLessonButton.textContent : '';
        if (saveLessonButton) { saveLessonButton.disabled = true; saveLessonButton.textContent = 'Building lesson…'; }

        try {
            const setData = cardSets[activeSetName];
            const cards = Array.isArray(setData.cards) ? setData.cards : [];
            if (cards.length === 0) {
                provideFeedback(setManagementFeedback, "This set has no cards to save.", "error");
                return;
            }

            // Fetch the player runtime (served alongside this app).
            const [playerHtmlTemplate, playerJs, sharedJs, styleCss] = await Promise.all([
                fetch('player/index.html').then(r => r.text()),
                fetch('player/player.js').then(r => r.text()),
                fetch('shared.js').then(r => r.text()),
                fetch('style.css').then(r => r.text())
            ]);

            const folder = sanitizeFolderName(activeSetName);
            const files = [];
            const usedNames = {};

            const lessonCards = cards.map((card, index) => {
                let baseName = (card.id || ('card' + index)).toString().replace(/[^a-z0-9_-]/gi, '_');
                if (usedNames[baseName]) baseName = baseName + '_' + index;
                usedNames[baseName] = true;

                const out = { id: card.id || baseName, word: card.word || '', imageDataUrl: null, audioType: 'none', audioDataUrl: null };

                if (card.imageDataUrl && card.imageDataUrl.indexOf('data:') === 0) {
                    const { bytes, mime } = dataUrlToBytes(card.imageDataUrl);
                    const path = `assets/images/${baseName}.${extensionForMime(mime)}`;
                    files.push({ path: `${folder}/${path}`, bytes });
                    out.imageDataUrl = path;
                }
                if (card.audioType === 'file' && card.audioDataUrl && card.audioDataUrl.indexOf('data:') === 0) {
                    const { bytes, mime } = dataUrlToBytes(card.audioDataUrl);
                    const path = `assets/audio/${baseName}.${extensionForMime(mime)}`;
                    files.push({ path: `${folder}/${path}`, bytes });
                    out.audioDataUrl = path;
                    out.audioType = 'file';
                }
                return out;
            });

            const lesson = {
                name: activeSetName,
                instructions: setData.instructions || '',
                customColors: setData.customColors || null,
                cards: lessonCards
            };

            const safeTitle = activeSetName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const playerHtml = playerHtmlTemplate.replace(/__LESSON_TITLE__/g, safeTitle);
            const dataJs = 'window.LESSON = ' + JSON.stringify(lesson, null, 2) + ';\n';
            const encoder = new TextEncoder();

            files.unshift(
                { path: `${folder}/index.html`, bytes: encoder.encode(playerHtml) },
                { path: `${folder}/style.css`, bytes: encoder.encode(styleCss) },
                { path: `${folder}/shared.js`, bytes: encoder.encode(sharedJs) },
                { path: `${folder}/player.js`, bytes: encoder.encode(playerJs) },
                { path: `${folder}/data.js`, bytes: encoder.encode(dataJs) }
            );

            const zipBytes = buildZip(files);
            const blob = new Blob([zipBytes], { type: 'application/zip' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${folder}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            provideFeedback(setManagementFeedback, `Lesson "${activeSetName}" saved. Unzip the folder and open index.html.`, "success");
        } catch (e) {
            console.error("Error building lesson:", e);
            provideFeedback(setManagementFeedback, `Could not build the lesson: ${e.message}. Make sure you opened the app via a local server (not file://).`, "error");
        } finally {
            if (saveLessonButton) { saveLessonButton.disabled = false; saveLessonButton.textContent = originalLabel || 'Save Lesson (ZIP)'; }
        }
    }
    function handleExportSet() {
        if (!activeSetName || !cardSets[activeSetName]) {
            provideFeedback(setManagementFeedback, "No active set loaded to export.", "error");
            return;
        }
        const setData = cardSets[activeSetName];
        const exportData = {
            setName: activeSetName,
            cards: Array.isArray(setData.cards) ? setData.cards : [],
            instructions: setData.instructions || "",
            customColors: setData.customColors || null
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${sanitizeFolderName(activeSetName)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        provideFeedback(setManagementFeedback, `Set "${activeSetName}" exported. Use "Import Set (JSON)" to restore it.`, "success");
    }

    function validateImportedCard(card, index) {
        const cardNumber = index + 1;
        if (!card || typeof card !== 'object' || Array.isArray(card)) {
            return `card ${cardNumber} is not an object`;
        }
        if (typeof card.id !== 'string') {
            return `card ${cardNumber} has a missing or non-string "id"`;
        }
        if (typeof card.word !== 'string') {
            return `card ${cardNumber} has a missing or non-string "word"`;
        }
        if (card.audioType !== 'file' && card.audioType !== 'none') {
            return `card ${cardNumber} has an invalid "audioType" (expected "file" or "none")`;
        }
        return null;
    }

    function handleImportSetFileChange(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedSetData = JSON.parse(e.target.result);

                // Basic validation
                if (!importedSetData || typeof importedSetData.cards === 'undefined' ||
                    typeof importedSetData.instructions === 'undefined') {
                    throw new Error("Invalid set file format. Missing required properties.");
                }
                if (!Array.isArray(importedSetData.cards)) throw new Error("Invalid set file: 'cards' should be an array.");

                const cardErrors = importedSetData.cards
                    .map((card, index) => validateImportedCard(card, index))
                    .filter(Boolean);
                if (cardErrors.length > 0) {
                    const others = cardErrors.length - 1;
                    const summary = others > 0
                        ? `${cardErrors[0]} (and ${others} more malformed card${others === 1 ? '' : 's'})`
                        : cardErrors[0];
                    throw new Error(`Invalid set file: ${summary}. Nothing was imported.`);
                }

                let importSetName = file.name.replace(/\.json$/i, ''); // Use filename as set name
                importSetName = importSetName.replace(/[^a-z0-9 _-]/gi, ''); // Sanitize

                if (cardSets[importSetName]) {
                    if (!confirm(`A set named "${importSetName}" already exists. Overwrite it?`)) {
                        provideFeedback(setManagementFeedback, "Import cancelled.", "info");
                        if(importSetFile) importSetFile.value = ""; // Reset file input
                        return;
                    }
                }

                cardSets[importSetName] = {
                    cards: importedSetData.cards.map(card => ({ ...card, id: card.id || generateUniqueId() })), // Ensure IDs for older sets
                    instructions: importedSetData.instructions || "",
                    customColors: importedSetData.customColors || null
                };

                saveCardSetsToLocalStorage(false); // Don't show success message for import
                updateSetSelectorDropdown();
                if(cardSetSelect) cardSetSelect.value = importSetName;
                loadSet(importSetName);
                provideFeedback(setManagementFeedback, `Set "${importSetName}" imported successfully.`, "success");

            } catch (error) {
                console.error("Error importing set:", error);
                provideFeedback(setManagementFeedback, `Error importing set: ${error.message}`, "error");
            } finally {
                if(importSetFile) importSetFile.value = "";
            }
        };
        reader.readAsText(file);
    }

    function handleRenameSet() {
        if (!activeSetName || !cardSets[activeSetName]) {
            provideFeedback(setManagementFeedback, "No active set loaded to rename.", "error");
            return;
        }
        if (editingCardId) {
            provideFeedback(cardCreationFeedback, "Please finish editing the current card before renaming the set.", "warning");
            return;
        }

        const newName = prompt(`Enter new name for the set "${activeSetName}":`, activeSetName);
        if (newName === null || newName.trim() === "") {
            provideFeedback(setManagementFeedback, "Rename cancelled or empty name provided.", "info");
            return;
        }
        const trimmedNewName = newName.trim();
        if (trimmedNewName === activeSetName) {
            provideFeedback(setManagementFeedback, "New name is the same as the current name. No changes made.", "info");
            return;
        }
        if (cardSets[trimmedNewName]) {
            provideFeedback(setManagementFeedback, `A set named "${trimmedNewName}" already exists. Choose a different name.`, "error");
            return;
        }

        // Proceed with rename
        cardSets[trimmedNewName] = cardSets[activeSetName];
        delete cardSets[activeSetName];
        activeSetName = trimmedNewName;

        saveCardSetsToLocalStorage(); // Will show its own success message
        updateSetSelectorDropdown();
        if(cardSetSelect) cardSetSelect.value = activeSetName;
        displayActiveSetName();
        provideFeedback(setManagementFeedback, `Set renamed to "${activeSetName}".`, "success");
    }

    function handleClearAllSets() {
        if (Object.keys(cardSets).length === 0) {
            provideFeedback(setManagementFeedback, "No sets to clear.", "info");
            return;
        }
        if (confirm("Are you sure you want to delete ALL card sets? This action cannot be undone.")) {
            cardSets = {};
            activeSetName = null;
            // Call loadSet with null or a non-existent name to reset UI state
            loadSet(null); // This will clear currentCards, instructions, etc. and update UI
            updateSetSelectorDropdown(); // Update dropdown and clearAllSetsButton state
            saveCardSetsToLocalStorage(false); // Save empty sets, no success message
            provideFeedback(setManagementFeedback, "All card sets have been cleared.", "success");
        }
    }


    function saveCardSetsToLocalStorage(showFeedback = true) {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cardSets));
            if (activeSetName && cardSets[activeSetName] && setManagementFeedback && showFeedback) {
                provideFeedback(setManagementFeedback, `Set "${activeSetName}" saved successfully.`, "success");
            }
        } catch (e) {
            console.error("Error saving to Local Storage:", e);
            let errorMessage = "Could not save sets. Local Storage might be full or disabled.";
            if (e.name === 'QuotaExceededError') {
                const currentDataSize = new TextEncoder().encode(JSON.stringify(cardSets)).length / (1024 * 1024);
                errorMessage = `Error: Browser storage limit reached (~${CONFIG.LOCAL_STORAGE_APPROX_LIMIT_MB}MB per site). Your set (${currentDataSize.toFixed(2)}MB) is too large. Try reducing image/audio file sizes, having fewer cards, or splitting your set into smaller ones.`;
            } else {
                errorMessage = `Error saving set: ${e.message || 'Unknown error'}.`;
            }
            if (setManagementFeedback) provideFeedback(setManagementFeedback, errorMessage, "error");
        }
    }

    function loadCardSetsFromLocalStorage() {
        const storedSets = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (storedSets) {
            try {
                const parsedSets = JSON.parse(storedSets);
                Object.keys(parsedSets).forEach(setName => {
                    if (!parsedSets[setName].cards) parsedSets[setName].cards = [];
                    if (typeof parsedSets[setName].instructions === 'undefined') parsedSets[setName].instructions = "";
                    if (typeof parsedSets[setName].customColors === 'undefined') parsedSets[setName].customColors = null;
                    // Ensure cards have IDs (for older sets that might not)
                    parsedSets[setName].cards.forEach(card => {
                        if (!card.id) card.id = generateUniqueId();
                    });
                });
                cardSets = parsedSets;
            } catch (e) {
                console.error("Error parsing sets from Local Storage:", e);
                cardSets = {};
                let backupNote = "";
                try {
                    localStorage.setItem(BACKUP_STORAGE_KEY, storedSets);
                    backupNote = ` The raw data was kept under the browser storage key "${BACKUP_STORAGE_KEY}" so it can be recovered.`;
                } catch (backupError) {
                    console.error("Could not back up corrupted set data:", backupError);
                    backupNote = " The original data is still in browser storage and was not deleted.";
                }
                if (setManagementFeedback) provideFeedback(setManagementFeedback, `Could not load previously saved sets due to a data error. Your data was NOT deleted.${backupNote}`, "error");
            }
        }
    }

    function updateSetSelectorDropdown() {
        if(!cardSetSelect) return;
        const currentSelectedValue = cardSetSelect.value;
        cardSetSelect.innerHTML = '<option value="">-- Select a Set --</option>';
        Object.keys(cardSets).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())).forEach(setName => {
            const option = document.createElement('option');
            option.value = setName;
            option.textContent = setName;
            cardSetSelect.appendChild(option);
        });

        if (cardSets[currentSelectedValue]) {
            cardSetSelect.value = currentSelectedValue;
        } else if (activeSetName && cardSets[activeSetName]) {
            cardSetSelect.value = activeSetName;
        } else if (Object.keys(cardSets).length > 0) {
            cardSetSelect.value = Object.keys(cardSets)[0];
        } else {
            cardSetSelect.value = "";
        }
        if (clearAllSetsButton) { // Centralized management of this button's state
            clearAllSetsButton.disabled = Object.keys(cardSets).length === 0;
        }
    }

    function displayActiveSetName() {
        const nameToShow = activeSetName || "No Set Loaded";
        if (currentSetNameDisplay) currentSetNameDisplay.textContent = nameToShow;
        activeSetDisplayElements.forEach(el => el.textContent = activeSetName ? `: ${nameToShow}` : "");
        if (saveLessonButton) saveLessonButton.disabled = !activeSetName;
        if (exportSetButton) exportSetButton.disabled = !activeSetName;
        if (renameSetButton) renameSetButton.disabled = !activeSetName;
    }

    // Helper function to apply default card colors
    function applyDefaultCardColors() {
        const defaultFront = getComputedStyle(document.documentElement).getPropertyValue('--card-front-bg-default').trim();
        const defaultBack = getComputedStyle(document.documentElement).getPropertyValue('--card-back-bg-default').trim();
        if (cardFrontColorInput) cardFrontColorInput.value = defaultFront;
        if (cardBackColorInput) cardBackColorInput.value = defaultBack;
    }


    function sanitizeFilenameForWord(filename) {
        let nameWithoutExtension = filename.substring(0, filename.lastIndexOf('.')) || filename;
        // Replace underscores and hyphens with spaces
        let sanitized = nameWithoutExtension.replace(/[_-]/g, ' ');
        // Remove excessive spacing
        sanitized = sanitized.replace(/\s+/g, ' ').trim();
        // Optional: Capitalize first letter of each word (Title Case)
        sanitized = sanitized.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.substring(1)).join(' ');
        return sanitized;
    }

    async function handleBatchImageUpload(files) {
        if (!activeSetName) {
            provideFeedback(cardCreationFeedback, "Please create or load a set before batch adding cards.", "error");
            if (imageInput) imageInput.value = ""; // Clear the input
            return;
        }
        if (!files || files.length === 0) {
            provideFeedback(cardCreationFeedback, "No files selected for batch upload.", "info");
            return;
        }

        provideFeedback(cardCreationFeedback, `Starting batch processing for ${files.length} images...`, "info");
        if (addOrUpdateCardButton) {
            addOrUpdateCardButton.disabled = true;
            addOrUpdateCardButton.textContent = "Processing Batch...";
        }

        let cardsAddedCount = 0;
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith('image/')) {
                provideFeedback(cardCreationFeedback, `Skipping non-image file: ${file.name}`, "warning");
                continue;
            }

            provideFeedback(cardCreationFeedback, `Processing ${i + 1}/${files.length}: ${file.name}`, "info");

            const word = sanitizeFilenameForWord(file.name);
            let imageDataUrl = null;
            try {
                imageDataUrl = await resizeImage(file, CONFIG.MAX_IMAGE_WIDTH, CONFIG.MAX_IMAGE_HEIGHT, CONFIG.IMAGE_COMPRESSION_QUALITY);
            } catch (e) {
                provideFeedback(cardCreationFeedback, `Error processing image ${file.name}: ${e.message}. Skipping.`, "error");
                continue; // Skip this card
            }

            const cardData = {
                id: generateUniqueId(),
                word: word,
                imageDataUrl: imageDataUrl,
                audioType: 'none',
                audioDataUrl: null
            };
            currentCards.push(cardData);
            cardsAddedCount++;
        }

        updateCreatorCardListView();
        updateSetProgressDisplays();
        if (imageInput) imageInput.value = ""; // Clear the file input after processing
        updateImagePreview("", "", "");
        if (addOrUpdateCardButton) {
            addOrUpdateCardButton.disabled = false;
            addOrUpdateCardButton.textContent = "Add Card to Set";
        }
        provideFeedback(cardCreationFeedback, `Batch processing complete. ${cardsAddedCount} cards added to the set. Remember to save the set.`, "success");
        updateStudyAndGameTabAvailability(); // Update tab states
    }

    function displayInstructions(tabType) {
        const displayElement = tabType === 'flashcard' ? flashcardInstructionsDisplay : memoryGameInstructionsDisplay;
        if (displayElement) {
            const instructions = activeSetName && cardSets[activeSetName] ? cardSets[activeSetName].instructions : "";
            if (instructions) {
                displayElement.textContent = instructions;
                displayElement.style.display = 'block';
            } else {
                displayElement.textContent = '';
                displayElement.style.display = 'none';
            }
        }
    }
    async function resizeImage(file, maxWidth, maxHeight, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions while maintaining aspect ratio
                    if (width > height) { // Landscape
                        if (width > maxWidth) {
                            height *= maxWidth / width;
                            width = maxWidth;
                        }
                    } else { // Portrait or Square
                        if (height > maxHeight) {
                            width *= maxHeight / height;
                            height = maxHeight;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    // Ensure white background for transparent images if saving as JPEG
                    ctx.fillStyle = "#FFFFFF"; // Solid background for JPEG output
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, width, height);

                    // Export as JPEG with specified quality
                    try {
                        const dataUrl = canvas.toDataURL('image/jpeg', quality);
                        resolve(dataUrl);
                    } catch (canvasError) {
                        reject(new Error(`Canvas export error: ${canvasError.message}`));
                    }
                };
                img.onerror = (imgError) => {
                    reject(new Error(`Image loading error: ${imgError.message || 'Could not load image'}`));
                };
                img.src = e.target.result;
            };
            reader.onerror = (readerError) => {
                reject(new Error(`File reading error: ${readerError.target.error || 'Unknown error'}`));
            };
            reader.readAsDataURL(file);
        });
    }

    async function handleAddOrUpdateCard() {
        if (!activeSetName) {
            if (cardCreationFeedback) provideFeedback(cardCreationFeedback, "Please create or load a set before adding cards.", "error");
            return;
        }
        if (!wordInput || !imageInput || !audioInput || !addOrUpdateCardButton || !cardCreationFeedback) {
            console.error("One or more critical elements for adding/editing a card are missing.");
            return;
        }

        const word = wordInput.value.trim();
        const imageFile = imageInput.files[0];
        const audioFile = audioInput.files[0];

        if (!word) {
            provideFeedback(cardCreationFeedback, "Word/Identifier is required.", "error");
            return;
        }

        if(addOrUpdateCardButton) {
            addOrUpdateCardButton.disabled = true;
            addOrUpdateCardButton.textContent = editingCardId ? "Updating..." : "Processing...";
        }


        let cardData;
        let existingCard = null;

        if (editingCardId) {
            existingCard = currentCards.find(card => card.id === editingCardId);
            if (!existingCard) {
                provideFeedback(cardCreationFeedback, "Error: Card to edit not found.", "error");
                resetCardCreationForm();
                return;
            }
            cardData = { ...existingCard }; // Start with existing data
        } else {
            cardData = { id: generateUniqueId() };
        }

        cardData.word = word;
        delete cardData.ttsText;
        delete cardData.ttsParams;

        // Image handling
        if (imageFile) {
            if (imageFile.size > CONFIG.MAX_IMAGE_FILE_SIZE_FOR_WARNING_BYTES) {
                provideFeedback(cardCreationFeedback, `Processing large image (${(imageFile.size / (1024 * 1024)).toFixed(2)} MB)... Resizing and compressing.`, "warning");
            } else {
                provideFeedback(cardCreationFeedback, "Processing image...", "info");
            }
            try {
                cardData.imageDataUrl = await resizeImage(
                    imageFile,
                    CONFIG.MAX_IMAGE_WIDTH,
                    CONFIG.MAX_IMAGE_HEIGHT,
                    CONFIG.IMAGE_COMPRESSION_QUALITY
                );
            } catch (e) {
                provideFeedback(cardCreationFeedback, `Error processing image: ${e.message || 'Unknown error'}`, "error");
                if(addOrUpdateCardButton) {
                    addOrUpdateCardButton.disabled = false;
                    addOrUpdateCardButton.textContent = editingCardId ? "Update Card" : "Add Card to Set";
                }
                return;
            }
        } else if (!editingCardId) {
            cardData.imageDataUrl = null;
        }


        // Audio handling (local files only)
        if (audioFile) {
            if (audioFile.size > CONFIG.MAX_AUDIO_FILE_SIZE_FOR_WARNING_BYTES) {
                provideFeedback(cardCreationFeedback, `Warning: Audio file is large (${(audioFile.size / (1024 * 1024)).toFixed(2)} MB). Large files consume significant storage and may prevent saving the set.`, "warning");
            }
            try {
                cardData.audioDataUrl = await readFileAsDataURL(audioFile);
                cardData.audioType = 'file';
            } catch (e) {
                provideFeedback(cardCreationFeedback, `Error reading audio file: ${e.message || 'Unknown error'}`, "error");
                if(addOrUpdateCardButton) {
                    addOrUpdateCardButton.disabled = false;
                    addOrUpdateCardButton.textContent = editingCardId ? "Update Card" : "Add Card to Set";
                }
                return;
            }
        } else if (cardData.audioDataUrl) {
            cardData.audioType = 'file';
        } else {
            cardData.audioDataUrl = null;
            cardData.audioType = 'none';
        }


        if (editingCardId) {
            const index = currentCards.findIndex(card => card.id === editingCardId);
            if (index > -1) {
                currentCards[index] = cardData;
                provideFeedback(cardCreationFeedback, `Card "${cardData.word}" updated. Remember to save the set.`, "success");
            }
        } else {
            currentCards.push(cardData);
            provideFeedback(cardCreationFeedback, `Card "${cardData.word}" added. Remember to save the set.`, "success");
        }

        updateCreatorCardListView();
        updateSetProgressDisplays();
        resetCardCreationForm();

        const hasEnoughCardsForFlashcards = currentCards.length > 0;
        const hasEnoughCardsForMemory = currentCards.length >= 2;
        disableStudyAndGameTabs(!hasEnoughCardsForFlashcards);
        if (memoryGameTabButton) memoryGameTabButton.disabled = !hasEnoughCardsForMemory;
    }
    function resetCardCreationForm() {
        editingCardId = null;
        if (editingCardIdInput) editingCardIdInput.value = "";
        if (wordInput) wordInput.value = "";
        if (imageInput) imageInput.value = "";
        updateImagePreview("", "", "");

        if (audioInput) audioInput.value = "";
        updateAudioPreview("", "");

        if(addOrUpdateCardButton) {
            addOrUpdateCardButton.textContent = "Add Card to Set";
            addOrUpdateCardButton.disabled = false;
        }
        if(cardCreationFeedback) provideFeedback(cardCreationFeedback, "", "info"); // Clear feedback
    }

    // New helper functions for clear buttons
    function handleClearImage() {
        if (imageInput) imageInput.value = ""; // Clear the file input selection
        updateImagePreview("", "Image selection cleared.", "");

        if (editingCardId) {
            const cardToEdit = currentCards.find(c => c.id === editingCardId);
            if (cardToEdit) {
                cardToEdit.imageDataUrl = null; // Mark for removal on update
            }
            provideFeedback(cardCreationFeedback, "Image cleared from card. Click 'Update Card' to save this change.", "info");
        } else {
            provideFeedback(cardCreationFeedback, "Image selection cleared.", "info");
        }
    }

    function handleClearAudio() {
        if (audioInput) audioInput.value = ""; // Clear the file input selection
        updateAudioPreview("", "Audio file selection cleared.");

        if (editingCardId) {
            const cardToEdit = currentCards.find(c => c.id === editingCardId);
            if (cardToEdit) {
                cardToEdit.audioDataUrl = null;
                cardToEdit.audioType = 'none';
            }
            provideFeedback(cardCreationFeedback, "Audio cleared from card. Click 'Update Card' to save this change.", "info");
        } else {
            provideFeedback(cardCreationFeedback, "Audio file selection cleared.", "info");
        }
    }


    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = (errorEvent) => reject(errorEvent.target.error || new Error("FileReader error"));
            reader.readAsDataURL(file);
        });
    }

    function updateCreatorCardListView() {
        if (!createdCardsListDiv) return;
        createdCardsListDiv.innerHTML = "";

        if (currentCards.length === 0) {
            if (noCardsInSetMessage) {
                noCardsInSetMessage.style.display = 'block';
            }
        } else {
            if (noCardsInSetMessage) {
                noCardsInSetMessage.style.display = 'none';
            }
            currentCards.forEach((card, index) => {
                const preview = document.createElement('div');
                preview.className = 'card-preview';

                const img = document.createElement('img');
                img.src = card.imageDataUrl || 'data:image/svg+xml;charset=UTF-8,%3Csvg%20width%3D%2250%22%20height%3D%2250%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Crect%20width%3D%2250%22%20height%3D%2250%22%20fill%3D%22%23e9e9e9%22%2F%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20dominant-baseline%3D%22middle%22%20text-anchor%3D%22middle%22%20font-family%3D%22sans-serif%22%20font-size%3D%2210px%22%20fill%3D%22%23aaa%22%3ENo%20Img%3C%2Ftext%3E%3C%2Fsvg%3E';
                img.alt = card.imageDataUrl ? `Preview for ${card.word}` : 'No image available';
                img.onerror = function() {
                    this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50"%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="8px" fill="%23666"%3EError%3C/text%3E%3C/svg%3E';
                    this.alt='Image load error';
                };
                preview.appendChild(img);

                const cardInfo = document.createElement('div');
                cardInfo.className = 'card-info';

                const wordSpan = document.createElement('span');
                wordSpan.className = 'word';
                wordSpan.textContent = `${index + 1}. ${card.word}`;
                cardInfo.appendChild(wordSpan);

                const audioTypeSpan = document.createElement('span');
                audioTypeSpan.className = 'audio-type';
                audioTypeSpan.textContent = `Audio: ${card.audioDataUrl ? 'Uploaded File' : 'None'}`;
                cardInfo.appendChild(audioTypeSpan);

                preview.appendChild(cardInfo);

                if (card.audioDataUrl) {
                    const audioIndicator = document.createElement('span');
                    audioIndicator.className = 'audio-indicator';
                    audioIndicator.textContent = '🔊';
                    audioIndicator.setAttribute('aria-label', 'Has audio');
                    preview.appendChild(audioIndicator);
                }

                const cardActionsDiv = document.createElement('div');
                cardActionsDiv.className = 'card-actions';

                const editBtn = document.createElement('button');
                editBtn.className = 'edit-card-btn';
                editBtn.dataset.id = card.id;
                editBtn.title = `Edit card: ${card.word}`;
                editBtn.setAttribute('aria-label', `Edit card: ${card.word}`);
                editBtn.innerHTML = '✏️ <span class="visually-hidden">Edit</span>';
                cardActionsDiv.appendChild(editBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-card-btn';
                deleteBtn.dataset.id = card.id;
                deleteBtn.title = `Delete card: ${card.word}`;
                deleteBtn.setAttribute('aria-label', `Delete card: ${card.word}`);
                deleteBtn.innerHTML = '🗑️ <span class="visually-hidden">Delete</span>';
                cardActionsDiv.appendChild(deleteBtn);

                preview.appendChild(cardActionsDiv);
                createdCardsListDiv.appendChild(preview);
            });
        }
    }
    function handleEditCardFromList(event) {
        const button = event.target.closest('.edit-card-btn');
        if (!button || !activeSetName) return;

        const cardIdToEdit = button.dataset.id;
        const cardToEdit = currentCards.find(c => c.id === cardIdToEdit);

        if (!cardToEdit) {
            provideFeedback(cardCreationFeedback, "Could not find card to edit.", "error");
            return;
        }

        editingCardId = cardIdToEdit;
        if(editingCardIdInput) editingCardIdInput.value = cardIdToEdit;

        if(wordInput) wordInput.value = cardToEdit.word;
        if(imageInput) imageInput.value = ""; // Clear file input
        updateImagePreview(
            cardToEdit.imageDataUrl || "",
            cardToEdit.imageDataUrl ? "(Current image loaded)" : "",
            cardToEdit.imageDataUrl ? `Current image for ${cardToEdit.word}` : ""
        );

        if(audioInput) audioInput.value = "";
        if (cardToEdit.audioDataUrl) {
            updateAudioPreview(cardToEdit.audioDataUrl, "(Current audio file loaded)");
        } else {
            updateAudioPreview("", "");
        }

        if(addOrUpdateCardButton) addOrUpdateCardButton.textContent = "Update Card";
        provideFeedback(cardCreationFeedback, `Editing card: "${cardToEdit.word}". Change details and click "Update Card".`, "info");
        if(wordInput) wordInput.focus();
    }


    function handleDeleteCardFromList(event) {
        const button = event.target.closest('.delete-card-btn');
        if (!button) return;

        const cardIdToDelete = button.dataset.id;
        const cardIndex = currentCards.findIndex(card => card.id === cardIdToDelete);

        if (cardIndex > -1) {
            const cardWord = currentCards[cardIndex].word;
            if (confirm(`Are you sure you want to delete the card "${cardWord}"?`)) {
                currentCards.splice(cardIndex, 1);
                if (editingCardId === cardIdToDelete) {
                    resetCardCreationForm();
                }
                updateCreatorCardListView();
                updateSetProgressDisplays();
                if (cardCreationFeedback) provideFeedback(cardCreationFeedback, `Card "${cardWord}" deleted. Remember to save the set.`, "info");

                const hasEnoughCardsForFlashcards = currentCards.length > 0;
                const hasEnoughCardsForMemory = currentCards.length >= 2;
                disableStudyAndGameTabs(!hasEnoughCardsForFlashcards);
                if(memoryGameTabButton) memoryGameTabButton.disabled = !hasEnoughCardsForMemory;
            }
        }
    }

    function generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
    }

    // --- Flashcard Mode ---
    // Helper function to determine the description of the visible side of a flashcard
    function getFlashcardVisibleSideDescription(isFlipped, studyMode, isReversed) {
        let frontContentDesc = "content"; // What's on the "natural" front if not reversed
        let backContentDesc = "content";  // What's on the "natural" back if not reversed

        switch (studyMode) {
            case 'image_text_audio':
                frontContentDesc = "image"; backContentDesc = "text";
                break;
            case 'image_audio':
                frontContentDesc = "image"; backContentDesc = "audio";
                break;
            case 'audio_text':
                frontContentDesc = "audio"; backContentDesc = "text";
                break;
            case 'audio_only':
                // For audio_only, both sides are audio; the distinction might not be meaningful for ARIA label.
                return "audio"; // Simplified for audio-only mode
        }

        if (isReversed) { // The "natural back" (e.g., text) is shown first
            return isFlipped ? frontContentDesc : backContentDesc;
        } else { // The "natural front" (e.g., image) is shown first
            return isFlipped ? backContentDesc : frontContentDesc;
        }
    }

    // Helper function to update ARIA label for a flashcard
    function updateFlashcardAriaLabel(cardElement, cardData, isFlipped, studyMode, isReversed) {
        const visibleSideDescription = getFlashcardVisibleSideDescription(isFlipped, studyMode, isReversed);
        cardElement.setAttribute('aria-label', `Flashcard for ${cardData.word}. Showing ${visibleSideDescription}. Press space or enter to flip.`);
    }

    let flashcardDeck = [];

    function renderFlashcardView() {
        if (!flashcardContainer || !flipAllButton || !shuffleDeckButton) return;
        flashcardContainer.innerHTML = "";
        if(studyModeSelect) studyModeSelect.disabled = (currentCards.length === 0);
        displayInstructions('flashcard');

        if (!activeSetName || currentCards.length === 0) {
            if (flashcardEmptyMessage) flashcardContainer.appendChild(flashcardEmptyMessage);
            if(flipAllButton) flipAllButton.disabled = true;
            if(shuffleDeckButton) shuffleDeckButton.disabled = true;
            return;
        }
        flashcardDeck = shuffleArray([...currentCards]);
        _renderFlashcardDeck();
        if(flipAllButton) flipAllButton.disabled = false;
        if(shuffleDeckButton) shuffleDeckButton.disabled = false;
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
        card.dataset.cardId = cardData.id; // For easier data retrieval

        // Apply custom colors if they exist for the current set
        if (currentSetCustomColors) {
            if (currentSetCustomColors.front) {
                card.style.setProperty('--card-front-bg-override', currentSetCustomColors.front);
            }
            if (currentSetCustomColors.back) {
                card.style.setProperty('--card-back-bg-override', currentSetCustomColors.back);
            }
        }

        const visualFrontFace = document.createElement('div');
        visualFrontFace.className = 'flashcard-front';

        const visualBackFace = document.createElement('div');
        visualBackFace.className = 'flashcard-back';

        // --- Create all potential content elements ---
        const imageContainer = document.createElement('div');
        imageContainer.className = 'image-container';
        if (cardData.imageDataUrl) {
            const img = document.createElement('img');
            img.src = cardData.imageDataUrl;
            img.alt = `Image for ${cardData.word}`;
            img.onerror = function() {
                this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50"%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="8px" fill="%23666"%3EError%3C/text%3E%3C/svg%3E';
                this.alt='Image load error';
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
        
        // --- Determine what goes on front and back based on studyMode and flashcardReversed ---
        let frontElements = [], backElements = [];

        // Determine primary and secondary content based on flashcardReversed
        let primaryContent = { image: imageContainer, text: wordDisplay, audio: playButtonForImageSide }; // Assuming audio on image side is primary
        let secondaryContent = { image: imageContainer, text: wordDisplay, audio: playButtonForWordSide }; // Assuming audio on word side is secondary

        if (flashcardReversed) { // Word/Text is "front-facing"
            primaryContent = { image: imageContainer, text: wordDisplay, audio: playButtonForWordSide };
            secondaryContent = { image: imageContainer, text: wordDisplay, audio: playButtonForImageSide };

            switch (currentStudyMode) {
                case 'image_text_audio': // Text (+Audio) front, Image (+Audio) back
                    frontElements.push(primaryContent.text);
                    if (primaryContent.audio) frontElements.push(primaryContent.audio);
                    backElements.push(secondaryContent.image);
                    if (secondaryContent.audio) backElements.push(secondaryContent.audio);
                    break;
                case 'image_audio': // Audio (from text side) front, Image (+Audio) back
                    if (primaryContent.audio) frontElements.push(primaryContent.audio); else frontElements.push(document.createTextNode("Audio"));
                    backElements.push(secondaryContent.image);
                    if (secondaryContent.audio) backElements.push(secondaryContent.audio);
                    break;
                case 'audio_text': // Text (+Audio) front, Audio (from image side) back
                    frontElements.push(primaryContent.text);
                    if (primaryContent.audio) frontElements.push(primaryContent.audio);
                    if (secondaryContent.audio) backElements.push(secondaryContent.audio); else backElements.push(document.createTextNode("Audio"));
                    break;
                case 'audio_only': // Audio (from text side) front, Audio (from image side) back
                    if (primaryContent.audio) frontElements.push(primaryContent.audio); else frontElements.push(document.createTextNode("Audio"));
                    if (secondaryContent.audio) backElements.push(secondaryContent.audio); else backElements.push(document.createTextNode("Audio"));
                    break;
            }
        } else { // Image is "front-facing"
            switch (currentStudyMode) {
                case 'image_text_audio': // Image (+Audio) front, Text (+Audio) back
                    frontElements.push(primaryContent.image);
                    if (primaryContent.audio) frontElements.push(primaryContent.audio);
                    backElements.push(secondaryContent.text);
                    if (secondaryContent.audio) backElements.push(secondaryContent.audio);
                    break;
                case 'image_audio': // Image (+Audio) front, Audio (from text side) back
                    frontElements.push(primaryContent.image);
                    if (primaryContent.audio) frontElements.push(primaryContent.audio);
                    if (secondaryContent.audio) backElements.push(secondaryContent.audio); else backElements.push(document.createTextNode("Audio"));
                    break;
                case 'audio_text': // Audio (from image side) front, Text (+Audio) back
                    if (primaryContent.audio) frontElements.push(primaryContent.audio); else frontElements.push(document.createTextNode("Audio"));
                    backElements.push(secondaryContent.text);
                    if (secondaryContent.audio) backElements.push(secondaryContent.audio);
                    break;
                case 'audio_only': // Audio (from image side) front, Audio (from text side) back
                    if (primaryContent.audio) frontElements.push(primaryContent.audio); else frontElements.push(document.createTextNode("Audio"));
                    if (secondaryContent.audio) backElements.push(secondaryContent.audio); else backElements.push(document.createTextNode("Audio"));
                    break;
            }
        }
        updateFlashcardAriaLabel(card, cardData, false, currentStudyMode, flashcardReversed); // Set initial ARIA label

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
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                flipCard();
            }
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

            if (cardData) {
                cardElement.classList.toggle('is-flipped');
                const isFlipped = cardElement.classList.contains('is-flipped');
                updateFlashcardAriaLabel(cardElement, cardData, isFlipped, currentStudyMode, flashcardReversed);
            } else {
                cardElement.classList.toggle('is-flipped'); // Fallback if data not found
            }
        });
    }

    function shuffleAndRenderFlashcards() {
        flashcardDeck = shuffleArray([...currentCards]);
        _renderFlashcardDeck();
    }

    function toggleReverseFlashcards() {
        if(reverseFlashcardsToggle) flashcardReversed = reverseFlashcardsToggle.checked;
        renderFlashcardView();
    }


    // --- Memory Game Mode ---
    let memoryGameCardsArray = [];

    function startNewMemoryGame() {
        if(!memoryGameContainer || !newMemoryGameButton || !memoryGameFeedback || !memoryGameDifficultySelect) return;
        memoryGameContainer.innerHTML = "";
        displayInstructions('memoryGame');
        provideFeedback(memoryGameFeedback, "", "info");

        if (!activeSetName || currentCards.length < 2) {
            memoryGameState.matchedPairsCount = 0;
            memoryGameState.totalPairsInGame = 0;
            updateMemoryGameProgressDisplay();
            if(memoryGameEmptyMessage) memoryGameContainer.appendChild(memoryGameEmptyMessage);
            if(newMemoryGameButton) newMemoryGameButton.textContent = "New Game / Shuffle";
            if(newMemoryGameButton) newMemoryGameButton.disabled = true;
            if(memoryGameDifficultySelect) memoryGameDifficultySelect.disabled = true;
            if (revealMemoryCardsButton) {
                revealMemoryCardsButton.disabled = true;
            }
            return;
        }
        if(newMemoryGameButton) newMemoryGameButton.disabled = false;
        if(memoryGameDifficultySelect) memoryGameDifficultySelect.disabled = false;
        if(newMemoryGameButton) newMemoryGameButton.textContent = "New Game / Shuffle";

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
        if (difficulty === "all") {
            numPairsToUse = pairPool.length;
        } else {
            numPairsToUse = parseInt(difficulty, 10);
        }
        numPairsToUse = Math.max(2, Math.min(numPairsToUse, pairPool.length));
        if (pairPool.length < numPairsToUse && difficulty !== "all") {
            provideFeedback(memoryGameFeedback, `Not enough unique cards for ${numPairsToUse} pairs. Using all ${pairPool.length} available pairs.`, "warning");
            numPairsToUse = pairPool.length;
        }
         if (numPairsToUse < 2) {
            memoryGameState.matchedPairsCount = 0;
            memoryGameState.totalPairsInGame = 0;
            updateMemoryGameProgressDisplay();
            provideFeedback(memoryGameFeedback, `Need at least 2 pairs to play. Current set has ${currentCards.length} cards.`, "error");
            if(memoryGameEmptyMessage) {
                 memoryGameContainer.innerHTML = "";
                 memoryGameContainer.appendChild(memoryGameEmptyMessage);
            }
            if(newMemoryGameButton) newMemoryGameButton.disabled = true;
            if (revealMemoryCardsButton) {
                revealMemoryCardsButton.disabled = true;
            }
            return;
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

        memoryCardsRevealed = false; // Reset reveal state for new game
        renderMemoryGameView();
        updateMemoryGameProgressDisplay();
        if (revealMemoryCardsButton) { // Enable reveal button once game is set up
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
        
        // Apply custom colors if they exist for the current set
        if (currentSetCustomColors) {
            if (currentSetCustomColors.front) {
                card.style.setProperty('--card-front-bg-override', currentSetCustomColors.front);
            }
            if (currentSetCustomColors.back) {
                card.style.setProperty('--card-back-bg-override', currentSetCustomColors.back);
            }
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
                    this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50"%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="8px" fill="%23666"%3EError%3C/text%3E%3C/svg%3E';
                    this.alt='Image load error';
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
        // Prevent individual card flips if all cards are globally revealed
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
        if (isMatch) {
            disableMatchedMemoryCards();
        } else {
            unflipMismatchedMemoryCards();
        }
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
                playCardAudio(cardDataForAudio,
                    () => console.log(`Match audio for "${cardDataForAudio.word}" finished.`),
                    (err) => {
                        console.error(`Match audio error for "${cardDataForAudio.word}": ${err}`);
                        // Optionally provide user feedback here
                        // provideFeedback(memoryGameFeedback, `Could not play match audio: ${err}`, "error");
                    }
                );
            }, CONFIG.MEMORY_MATCH_AUDIO_DELAY_MS);
        }

        memoryGameState.matchedPairsCount++;
        updateMemoryGameProgressDisplay();
        resetMemoryGameBoardTurnState();
        if (memoryGameState.matchedPairsCount === memoryGameState.totalPairsInGame) {
            if (memoryGameFeedback) provideFeedback(memoryGameFeedback, `Congratulations! You found all ${memoryGameState.totalPairsInGame} pairs!`, "success");
            if(newMemoryGameButton) newMemoryGameButton.textContent = "Play Again?";
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

        if (!memoryCardsRevealed) { // If cards are hidden, reveal them
            // Prevent revealing if a normal game turn is in progress (firstCardFlipped is set)
            if (memoryGameState.firstCardFlipped && !memoryGameState.secondCardFlipped) {
                provideFeedback(memoryGameFeedback, "Finish your current turn before revealing all cards.", "info");
                return;
            }

            memoryCardsRevealed = true;
            memoryGameState.lockBoard = true; // Lock board from normal play while revealed

            if (revealMemoryCardsButton) revealMemoryCardsButton.textContent = "Hide All Cards";
            if (newMemoryGameButton) newMemoryGameButton.disabled = true;

            memoryCards.forEach(card => {
                if (!card.classList.contains('matched')) {
                    card.classList.add('is-flipped');
                    const cardData = memoryGameCardsArray.find(c => c.uniqueGameId === card.dataset.uniqueGameId);
                    updateMemoryCardAriaLabel(card, cardData, 'revealed');
                }
            });
            provideFeedback(memoryGameFeedback, "All non-matched cards revealed with their real content. Click 'Hide All Cards' to resume.", "info");

        } else { // If cards are revealed, hide them
            memoryCardsRevealed = false;
            memoryGameState.lockBoard = false; // Unlock board for normal play

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

    // --- Initialize ---
    initializeApp();
});
