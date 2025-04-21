document.addEventListener('DOMContentLoaded', () => {
  // elements ---------------------------------------------------
  const titleScreen = document.getElementById('titleScreen');
  const gameScreen = document.getElementById('gameScreen');
  const playerCountDisplay = document.getElementById('playerCount');
  const dealerCards = document.getElementById('dealerCards');
  const dealerScore = document.getElementById('dealerScore');
  const playersContainer = document.getElementById('playersContainer');
  const hitBtn = document.getElementById('hitBtn');
  const stayBtn = document.getElementById('stayBtn');
  const message = document.getElementById('message');
  const playerTurnIndicator = document.getElementById('playerTurnIndicator');
  const gameStats = document.getElementById('gameStats');

  // setting game state ---------------------------------------------------------
  let playerCount = 1;
  let deck = [];
  let dealerHand = [];
  let players = [];
  let currentPlayerIndex = 0;
  let gameOver = false;
  let actionInProgress = false; // Prevent button spam
  let playerStats = []; // Array to hold individual player stats

  // card suit keyboard symbols, card values, card pickup
  const suits = ['♥', '♦', '♠', '♣'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const audioCard = new Audio('assets/card-sounds-35956.mp3');
  // event listeners / user inputs  ------------------------------------------------------------
  document.getElementById('decreasePlayer').addEventListener('click', () => {
    if (playerCount > 1) playerCountDisplay.textContent = --playerCount; // decrease player count, but not below 1
  });

  document.getElementById('increasePlayer').addEventListener('click', () => {
    if (playerCount < 4) playerCountDisplay.textContent = ++playerCount; // increase player count, but not above 4
  });

  document.getElementById('startGameBtn').addEventListener('click', () => {
    titleScreen.style.display = 'none'; // hide title screen once game starts
    gameScreen.style.display = 'block'; // show game screen
    initializePlayerStats(); // Set up stats for players
    startGame();
  });

  // quit button
  document.getElementById('quitBtn').addEventListener('click', () => {
    gameScreen.style.display = 'none'; // hide game screen
    titleScreen.style.display = 'block'; // show title screen
    playerStats = []; // Reset all player stats including dealer
    updateGameStatsDisplay(); // Clear stats display
    gameStats.textContent = "";
  });

  // play again button
  document.getElementById('playAgainBtn').addEventListener('click', () => {
    document.getElementById('playAgainContainer').style.display = 'none';
    startGame();
  });

  // hit and stay buttons (click)
  hitBtn.addEventListener('click', () => handleAction('hit')); // hit button
  stayBtn.addEventListener('click', () => handleAction('stay')); // stay button
  // hit and stay buttons (keyboard input)
  document.addEventListener('keydown', (e) => {
    if (!gameOver && !actionInProgress && (e.key.toLowerCase() === 'h')) handleAction('hit');
    if (!gameOver && !actionInProgress && (e.key.toLowerCase() === 's')) handleAction('stay');
  });

  // main game functions   ------------------------------------------------------------
  function initializePlayerStats() {
    // Create or maintain player stats
    if (playerStats.length === 0) {
      // First time initialization - include dealer as the last element
      for (let i = 0; i < playerCount; i++) {
        playerStats.push({ wins: 0, losses: 0 });
      }
      // Add dealer stats
      playerStats.push({ wins: 0, losses: 0 });
    } else if (playerStats.length < playerCount + 1) {
      // Add new players if player count increased
      while (playerStats.length < playerCount) {
        playerStats.push({ wins: 0, losses: 0 });
      }
      // Make sure dealer stats exist
      if (playerStats.length === playerCount) {
        playerStats.push({ wins: 0, losses: 0 });
      }
    } else if (playerStats.length > playerCount + 1) {
      // Remove extra players if player count decreased, but keep dealer stats
      playerStats = playerStats.slice(0, playerCount);
      // Make sure dealer stats are preserved
      playerStats.push({ wins: 0, losses: 0 });
    }
  }

  function updateGameStatsDisplay() { // Display and update each player's stats
    let statsHTML = ''; // blank string for initial stats

    for (let i = 0; i < playerCount; i++) { // loop through inputted player count
      statsHTML += `Player ${i + 1}: Wins: ${playerStats[i].wins} | Losses: ${playerStats[i].losses}<br>`;
    }
    if (playerStats.length > playerCount) {  // Show dealer stats 
      statsHTML += `Dealer:&nbsp;&nbsp;&nbsp;Wins: ${playerStats[playerCount].wins} | Losses: ${playerStats[playerCount].losses}`;
    }
    gameStats.innerHTML = statsHTML; // update stats display
  }

  function startGame() { // start / restart game
    deck = createDeck();
    dealerHand = [];
    gameOver = false; // do not allow game to end
    actionInProgress = false;
    document.getElementById('playAgainContainer').style.display = 'none'; // hide play again button, for first round
    message.textContent = ''; // clear message

    // set up decks for players -- create deck for each player --
    players = []; //initalize players array 
    playersContainer.innerHTML = '';
    for (let i = 0; i < playerCount; i++) { // loop through inputted player count
      const playerEl = document.createElement('div');
      playerEl.className = 'playerArea';
      playerEl.innerHTML = ` 
                  <h2>Player ${i + 1} | Total: <span id="score${i}">0</span></h2>
                  <div class="cards" id="cards${i}"></div>
              `; // create player area with score, cards, and stats
      playersContainer.appendChild(playerEl);

      players.push({
        hand: [],
        element: playerEl,
        scoreEl: document.getElementById(`score${i}`),
        cardsEl: document.getElementById(`cards${i}`),
        status: 'playing'
      });
    }

    // display overall stats
    updateGameStatsDisplay();

    // deal initial cards
    dealerCards.innerHTML = ''; // clear dealer's cards
    dealerScore.textContent = '?'; // hide dealer's score

    // deal to dealer
    dealerHand = [dealCard(), dealCard(true)];
    dealerCards.appendChild(createCardEl(dealerHand[0]));
    dealerCards.appendChild(createCardEl(dealerHand[1]));

    // deal to players
    players.forEach(player => {
      player.hand = [dealCard(), dealCard()];
      player.cardsEl.innerHTML = '';
      player.hand.forEach(card => player.cardsEl.appendChild(createCardEl(card)));
      player.scoreEl.textContent = calcHandValue(player.hand);
    });

    // start first player's turn
    currentPlayerIndex = 0;
    updateActivePlayer();
  }

  function handleAction(action) {
    if (gameOver || actionInProgress) return;
    actionInProgress = true; // lock actions
    disableButtons(); // disable buttons during action to stop user spamming

    const player = players[currentPlayerIndex];

    if (action === 'hit') {
      const card = dealCard(); // deal card to player
      player.hand.push(card);
      audioCard.play(); // play SFX!
      player.cardsEl.appendChild(createCardEl(card)); // add card to player's hand

      const score = calcHandValue(player.hand);
      player.scoreEl.textContent = score; // update player's score

      if (score > 21) { // check if player busts
        player.status = 'bust';  //  set player's status to bust
        player.element.classList.add('bust');
        message.textContent = `Player ${currentPlayerIndex + 1} busted!`; // display bust message
        setTimeout(() => {
          actionInProgress = false;
          nextTurn();
        }, 1000); // delay before next turn
      } else {
        setTimeout(() => {
          actionInProgress = false;
          enableButtons(); // re-enable buttons after action
        }, 500);
      }
    } else if (action === 'stay') {
      player.status = 'stayed'; // set player's status to stayed
      message.textContent = `Player ${currentPlayerIndex + 1} stays.`;
      setTimeout(() => {
        actionInProgress = false;
        nextTurn();
      }, 1000); // delay before next turn
    }
  }

  function nextTurn() { // move to next player's turn, until all players have gone. only then dealer plays
    currentPlayerIndex++;

    if (currentPlayerIndex < players.length) {
      updateActivePlayer();
    } else {
      const allPlayersBusted = players.every(player => player.status === 'bust');

      if (allPlayersBusted) {
        message.textContent = "All players busted! Dealer wins .";
        setTimeout(() => {
          endGame(true);
        }, 1000);
      } else {
        dealerPlay();
      }
    }
  }

  function dealerPlay() {
    disableButtons(); // disable buttons during dealer's turn -- prevent spamming
    playerTurnIndicator.textContent = "Dealer's Turn";
    message.textContent = "Dealer is playing...";

    // reveal hidden card 
    if (dealerHand[1].isHidden) {
      dealerHand[1].isHidden = false;
      const cardEl = dealerCards.children[1];
      cardEl.className = `card ${dealerHand[1].suit === '♥' || dealerHand[1].suit === '♦' ? 'red' : ''}`;
      cardEl.innerHTML = `
                  <div class="card-value">${dealerHand[1].value}</div>
                  <div class="card-suit">${dealerHand[1].suit}</div>
              `;
    }
    setTimeout(() => {
      let dealerValue = calcHandValue(dealerHand);
      dealerScore.textContent = dealerValue;
      dealerDrawSequence(dealerValue);
    }, 1000);
  }

  function dealerDrawSequence(currentValue) { // dealer draws cards until they reach 16 or bust
    if (currentValue < 16) {
      setTimeout(() => {
        const card = dealCard(); // deal card to dealer
        dealerHand.push(card);
        dealerCards.appendChild(createCardEl(card)); // add card to dealer's hand
        const newValue = calcHandValue(dealerHand);
        dealerScore.textContent = newValue; // update dealer's score

        dealerDrawSequence(newValue);
      }, 1000); // 1 second delay between dealer cards
    } else { // dealer is done drawing
      setTimeout(() => {
        endGame(false);
      }, 1000);
    }
  }

  function endGame(allPlayersBusted = false) { // end game and determine winner
    gameOver = true;
    const dealerIndex = playerCount; // makes it so dealer's stats are stored at the end of the playerStats array

    if (allPlayersBusted) {
      players.forEach((player, index) => {
        playerStats[index].losses++;
        playerStats[dealerIndex].wins++;
      });
      playerTurnIndicator.textContent = "Game Over - Dealer Wins";
    } else {
      const dealerValue = calcHandValue(dealerHand);
      const dealerBust = dealerValue > 21;

      if (dealerBust) {
        message.textContent = `Dealer busted with ${dealerValue}!`;

        // Find non-busted players and declare them winners
        let winnersFound = false;
        players.forEach((player, index) => {
          if (player.status !== 'bust') {
            playerStats[index].wins++;
            playerStats[dealerIndex].losses++;
            winnersFound = true;
          } else {
            playerStats[index].losses++;
            playerStats[dealerIndex].wins++;
          }
        });

        if (winnersFound) {
          playerTurnIndicator.textContent = "Game Over - Players Win";
        } else {
          playerTurnIndicator.textContent = "Game Over - Dealer Wins";
        }
      } else {
        message.textContent = `Dealer stays with ${dealerValue}.`;

        // Compare hands and determine winners
        let dealerWins = 0;
        let playerWins = 0;

        players.forEach((player, index) => {
          const playerValue = calcHandValue(player.hand);

          if (player.status === 'bust') {
            playerStats[index].losses++;
            playerStats[dealerIndex].wins++;
            dealerWins++;
          } else if (playerValue > dealerValue) {
            playerStats[index].wins++;
            playerStats[dealerIndex].losses++;
            playerWins++;
          } else if (playerValue < dealerValue) {
            playerStats[index].losses++;
            playerStats[dealerIndex].wins++;
            dealerWins++;
          }
          // Ties don't count as wins or losses for either side
        });

        if (playerWins > dealerWins) {
          playerTurnIndicator.textContent = "Game Over - Players Win";
        } else if (dealerWins > playerWins) {
          playerTurnIndicator.textContent = "Game Over - Dealer Wins";
        } else {
          playerTurnIndicator.textContent = "Game Over - It's a Tie";
        }
      }
    }

    // update overall game stats display
    updateGameStatsDisplay();

    // display play again button
    document.getElementById('playAgainContainer').style.display = 'block';

    disableButtons(); // disable buttons after game ends
    actionInProgress = false;
  }

  function updateActivePlayer() {
    // reset all players to an inactive state
    players.forEach(p => p.element.classList.remove('active'));

    // highlight current player
    players[currentPlayerIndex].element.classList.add('active');
    playerTurnIndicator.textContent = `Player ${currentPlayerIndex + 1}'s Turn`;
    message.textContent = "Hit or Stay?";

    enableButtons(); // enable buttons for current player's turn
  }

  // Helper Functions -----------------------------------------------------------
  function enableButtons() { // enable buttons 
    hitBtn.disabled = false;
    stayBtn.disabled = false;
  }

  function disableButtons() { // disable buttons
    hitBtn.disabled = true;
    stayBtn.disabled = true;
  }

  function createDeck() { // create deck of cards
    const newDeck = []; // start with empty deck, use for loop to generate all combinations of suits and values
    for (const suit of suits) {
      for (const value of values) {
        newDeck.push({ suit, value });
      }
    }

    // shuffle and randomize deck
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
  }

  function dealCard(isHidden = false) {
    if (deck.length === 0) deck = createDeck();
    const card = deck.pop();
    card.isHidden = isHidden;
    return card;
  }

  function createCardEl(card) { // create card element
    const cardEl = document.createElement('div');
    cardEl.className = `card ${card.isHidden ? 'face-down' : ''}`;
    if (!card.isHidden) {
      if (card.suit === '♥' || card.suit === '♦') cardEl.classList.add('red'); // add red class to hearts and diamonds

      cardEl.innerHTML = ` 
                  <div class="card-value">${card.value}</div> 
                  <div class="card-suit">${card.suit}</div>
              `; // add card value and suit to card element
    }

    return cardEl;
  }

  function calcHandValue(hand) { // calculate hand value
    let value = 0;
    let aceCount = 0;

    for (const card of hand) {
      if (card.isHidden) continue;

      if (card.value === 'A') {
        aceCount++; // keep track of aces for later
        value += 11;
      } else if (['J', 'Q', 'K'].includes(card.value)) { // face cards are equal to 10
        value += 10;
      } else {
        value += parseInt(card.value); // use the cards value as an integer
      }
    }

    // if needed, optimize aces to be 1 or 11 depending on hand value
    while (value > 21 && aceCount > 0) {
      value -= 10;
      aceCount--;
    }
    return value;
  }
});
