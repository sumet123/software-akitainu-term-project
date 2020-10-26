import React from "react";
import { makeStyles } from "@material-ui/core";
import { useParams, useHistory } from "react-router-dom";
import Chat from "./Chat";
import Game from "./Game";
import NavBar from "../../components/NavBar";
import { Palette } from "components";
import { Card } from "../../components/type";

const classNames = {
  root: {
    height: "100vh",
    width: "100vw",
    maxWidth: "100%",
  },
};

const allSelectableCards = Object.values(Card);
allSelectableCards.splice(allSelectableCards.indexOf(Card.explodingPuppy), 1);
allSelectableCards.splice(allSelectableCards.indexOf(Card.backCard), 1);

const timePerTurn = 30; // seconds
const timeForNope = 5; // seconds

class Gameplay extends React.Component {
  constructor(props) {
    super();
    this.state = {
      socket: props.socket,
      roomId: -1, // room Id
      usersData: [], // {userId, userName, userCards, isDead}
      createdTime: new Date(),
      leftCardNumber: -1, // left card number in the card pile
      nextUserId: -1,
      nextTurnLeft: 1,
      discardPile: [], // index 0 is the bottom,
      explodeId: -1,
      seeTheFutureId: -1,
      seeTheFutureCards: [],
      isSelectingPlayerId: -1,
      cardSelectorId: -1,
      targetId: -1,
      cardSelectorCards: [],
      userId: window.sessionStorage.getItem("userId"),
      usingEffectCard: Card.backCard, // Card.common2 for 2 of a kind, Card.common3 for 3 of a kind, Card.common5 for 5 diffrent kind of cards
      showCardSelectorBackCard: false,
      time: new Date(),
      newNextUserId: -1,
      newNextTurnLeft: 0,
      canNope: false,
      cardUserId: -1,
      countDownTime: 0,
      newCardSelectorId: -1,
    };
  }

  componentDidMount() {
    this.state.socket.on("new-custom-room", (data) => {
      console.log("new-custom-room", data);

      const { userId, roomId } = data;
      const usersData = [
        {
          userId,
          userName: "", // todo:
          userCards: [],
          numberOfCards: 0,
          isDead: 0,
        },
      ];

      this.setState({
        roomId,
        usersData,
        // todo: username
      });
    });
    this.state.socket.on("new-join-custom-other", (data) => {
      console.log("new-join-custom-other", data);
      if (!data) return;

      const { userId, userName, roomId } = data;
      if (this.findUserIdx(userId) !== -1) return;
      const { usersData } = this.state;
      const newUserData = {
        userId,
        userName,
        userCards: [],
        numberOfCards: 0,
        isDead: 0,
      };
      usersData.push(newUserData);
      this.setState({
        usersData,
        roomId,
      });
    });
    this.state.socket.on("new-join-custom-joiner", (data) => {
      console.log("new-join-custom-joiner", data);
      if (!data) return;
      const usersData = [];
      data.usersId.forEach((userId, idx) => {
        const newUserData = {
          userId,
          userName: data.usersName[idx],
          userCards: 0,
          numberOfCards: 0,
          isDead: 0,
        };
        usersData.push(newUserData);
      });

      this.setState({
        usersData,
        roomId: data.roomId,
      });
    });
    this.state.socket.on("new-card", (data) => {
      console.log("new-card", data);

      const {
        userId,
        roomId,
        card,
        leftCardNumber,
        nextUserId,
        nextTurnLeft,
      } = data;
      if (this.state.roomId !== roomId) return;
      if (card === Card.explodingPuppy) {
        this.drawExplodingPuppy(userId, roomId);
        this.setState({
          leftCardNumber,
        });
        return;
      }

      const userIdx = this.findUserIdx(userId);
      const { usersData } = this.state;
      usersData[userIdx].userCards.push(card);
      usersData[userIdx].numberOfCards++;

      this.setState({
        usersData,
        leftCardNumber,
        nextUserId,
        nextTurnLeft,
      });
    });
    this.state.socket.on("new-game", (data) => {
      console.log("new-game", data);

      const {
        roomId,
        leftCardNumber,
        usersId,
        usersCard,
        nextUserId,
        nextTurnLeft,
      } = data;
      if (this.state.roomId !== roomId) return;

      const usersData = [];
      usersId.forEach((userId, idx) => {
        const newUserData = {
          userId,
          userName: "", // todo:
          userCards: usersCard[idx],
          numberOfCards: usersCard[idx].length,
          isDead: 0,
        };
        usersData.push(newUserData);
      });

      this.setState({
        leftCardNumber,
        usersData,
        nextUserId,
        nextTurnLeft,
      });
    });
    this.state.socket.on("new-card-use", (data) => {
      console.log("new-card-use", data);

      const { userId, roomId, card, cardIdx, nextUserId, nextTurnLeft } = data;
      const { usersData, discardPile } = this.state;

      if (this.state.roomId !== roomId) return;
      const userIdx = this.findUserIdx(userId);
      if (usersData[userIdx].userCards[cardIdx] !== card) return;
      discardPile.push(card);
      usersData[userIdx].userCards.splice(cardIdx, 1);
      usersData[userIdx].numberOfCards--;

      this.setState({
        usersData,
        newNextUserId: nextUserId,
        newNextTurnLeft: nextTurnLeft,
        cardUserId: userId,
        usingEffectCard: card,
      });

      switch (card) {
        case Card.favor:
          this.setState({ isSelectingPlayerId: userId });
          break;
        default:
          this.setState({ canNope: true });
          this.newCountDown(timeForNope);
      }
    });
    this.state.socket.on("new-common-2", (data) => {
      console.log("new-common-2", data);

      const { userId, roomId, cards, cardsIdx } = data;
      if (this.state.roomId !== roomId) return;

      const { usersData, discardPile } = this.state;
      const userIdx = this.findUserIdx(userId);
      const userCard = usersData[userIdx].userCards;
      const newUserCard = [];
      userCard.forEach((card, idx) => {
        if (cardsIdx.indexOf(idx) === -1) newUserCard.push(card);
        else discardPile.push(card);
      });
      usersData[userIdx].userCards = newUserCard;
      usersData[userIdx].numberOfCards -= 2;

      this.setState({
        usersData,
        isSelectingPlayerId: userId,
        usingEffectCard: Card.common2,
      });
    });
    this.state.socket.on("receive-common-2", (data) => {
      console.log("receive-common-2", data);

      const { userId, roomId, targetId, targetCardIdx } = data;
      const { usersData } = this.state;
      if (this.state.roomId !== roomId) return;

      const userIdx = this.findUserIdx(userId);
      const targetIdx = this.findUserIdx(targetId);
      const targetCard = usersData[targetIdx].userCards[targetCardIdx];
      usersData[userIdx].userCards.push(targetCard);
      usersData[targetIdx].userCards.splice(targetCardIdx, 1);

      this.setState({ usersData });
    });
    this.state.socket.on("new-common-3", (data) => {
      console.log("new-common-3", data);

      const { userId, roomId, cards, cardsIdx } = data;
      if (this.state.roomId !== roomId) return;

      const { usersData, discardPile } = this.state;
      const userIdx = this.findUserIdx(userId);
      const userCard = usersData[userIdx].userCards;
      const newUserCard = [];
      userCard.forEach((card, idx) => {
        if (cardsIdx.indexOf(idx) === -1) newUserCard.push(card);
        else discardPile.push(card);
      });
      usersData[userIdx].userCards = newUserCard;
      usersData[userIdx].numberOfCards -= 3;

      this.setState({
        usersData,
        isSelectingPlayerId: userId,
        usingEffectCard: Card.common3,
      });
    });
    this.state.socket.on("receive-common-3", (data) => {
      console.log("receive-common-3", data);

      const { userId, roomId, targetId, selectCard } = data;
      const { usersData } = this.state;
      if (this.state.roomId !== roomId) return;

      const userIdx = this.findUserIdx(userId);
      const targetIdx = this.findUserIdx(targetId);

      const targetCardIdx = usersData[targetIdx].userCards.indexOf(selectCard);
      if (targetCardIdx === -1) return;

      const targetCard = usersData[targetIdx].userCards[targetCardIdx];
      usersData[userIdx].userCards.push(targetCard);
      usersData[targetIdx].userCards.splice(targetCardIdx, 1);

      this.setState({ usersData });
    });
    this.state.socket.on("new-common-5", (data) => {
      console.log("new-common-5", data);

      const { userId, roomId, cards, cardsIdx } = data;
      if (this.state.roomId !== roomId) return;

      const { usersData, discardPile } = this.state;

      const cardSelectorId = userId;
      const cardSelectorCards = [...discardPile];
      const showCardSelectorBackCard = false;

      const userIdx = this.findUserIdx(userId);
      const userCard = usersData[userIdx].userCards;
      const newUserCard = [];
      userCard.forEach((card, idx) => {
        if (cardsIdx.indexOf(idx) === -1) newUserCard.push(card);
        else discardPile.push(card);
      });
      usersData[userIdx].userCards = newUserCard;
      usersData[userIdx].numberOfCards -= 5;

      this.setState({
        usersData,
        cardSelectorId,
        cardSelectorCards,
        showCardSelectorBackCard,
        usingEffectCard: Card.common5,
      });
    });
    this.state.socket.on("receive-common-5", (data) => {
      console.log("receive-common-5", data);

      const { userId, roomId, selectCardIdx } = data;
      const { usersData, discardPile } = this.state;
      if (this.state.roomId !== roomId) return;
      const selectCard = discardPile[selectCardIdx];

      const userIdx = this.findUserIdx(userId);
      usersData[userIdx].userCards.push(selectCard);
      discardPile.splice(selectCardIdx, 1);

      this.setState({ usersData, discardPile });
    });
    this.state.socket.on("new-exploding-puppy", (data) => {
      console.log("new-exploding-puppy", data);

      const { userId, roomId } = data;
      const { usersData } = this.state;
      if (this.state.roomId !== roomId) return;
      this.setState({ usersData, explodeId: userId });
    });
    this.state.socket.on("finish-exploding-puppy", (data) => {
      console.log("finish-exploding-puppy", data);

      const { userId, roomId, nextUserId } = data;
      if (this.state.roomId !== roomId) return;

      const userIdx = this.findUserIdx(userId);
      const { usersData } = this.state;
      const defuseIdx = usersData[userIdx].userCards.indexOf(Card.defuse);
      usersData[userIdx].userCards.splice(defuseIdx, 1);
      usersData[userIdx].numberOfCards--;

      this.setState({ explodeId: -1, hasDefuse: 0, nextUserId });
    });
    this.state.socket.on("new-lose", (data) => {
      console.log("new-lose", data);

      const { userId, roomId, nextUserId } = data;
      if (this.state.roomId !== roomId) return;
      this.setState({ explodeId: -1, hasDefuse: 0, nextUserId });
    });
    this.state.socket.on("new-effect", (data) => {
      console.log("new-effect", data);

      const { userId, roomId, card } = data;
      if (this.state.roomId !== roomId) return;
      switch (card) {
        case Card.seeTheFuture:
          const { seeTheFutureCards } = data;
          this.setState({ seeTheFutureCards, seeTheFutureId: userId });
          break;
        case Card.favor:
          const { targetId, favorCardIdx } = data;
          const { usersData } = this.state;
          const userIdx = this.findUserIdx(userId);
          const targetIdx = this.findUserIdx(targetId);
          const favorCard = usersData[targetIdx].userCards[favorCardIdx];
          usersData[userIdx].userCards.push(favorCard);
          usersData[userIdx].numberOfCards++;
          usersData[targetIdx].userCards.splice(favorCardIdx, 1);
          usersData[targetIdx].numberOfCards--;
          this.setState({ usersData });
          break;
        case Card.attack:
          this.setState({
            nextTurnLeft: data.attackCard.nextTurnLeft,
            nextUserId: data.attackCard.nextUserId,
          });
          break;
        case Card.skip:
          this.setState({
            nextTurnLeft: data.skipCard.nextTurnLeft,
            nextUserId: data.skipCard.nextUserId,
          });
          this.newCountDown(timePerTurn);
          break;
      }
    });
    this.state.socket.on("new-select", (data) => {
      console.log("new-select", data);

      const { userId, roomId, targetId } = data;
      if (this.state.roomId !== roomId) return;

      let cardSelectorId,
        cardSelectorCards,
        showCardSelectorBackCard,
        newTargetId = targetId;
      const { usingEffectCard } = this.state;
      switch (usingEffectCard) {
        case Card.favor:
          cardSelectorId = targetId;
          cardSelectorCards = this.getUserCard(targetId);
          showCardSelectorBackCard = false;
          newTargetId = userId;
          break;
        case Card.common2:
          cardSelectorId = userId;
          cardSelectorCards = this.getUserCard(targetId);
          showCardSelectorBackCard = true;
          break;
        case Card.common3:
          cardSelectorId = userId;
          cardSelectorCards = allSelectableCards;
          showCardSelectorBackCard = false;
          break;
      }
      this.setState({
        newCardSelectorId: cardSelectorId,
        cardSelectorCards,
        showCardSelectorBackCard,
        targetId: newTargetId,
        canNope: true,
      });
      this.newCountDown(timeForNope);
    });
    this.state.socket.on("new-nope", (data) => {
      console.log("new-nope", data);
      const { userId, roomId } = data;
      if (this.state.roomId !== roomId) return;
      this.setState({
        canNope: false,
      });
      this.newCountDown(timePerTurn);
    });
    this.state.socket.on("no-new-nope", (data) => {
      console.log("no-new-nope", data);
      const {
        newNextUserId,
        newNextTurnLeft,
        cardUserId,
        userId,
        usingEffectCard,
        newCardSelectorId,
      } = this.state;
      this.newCountDown(10000000);
      this.setState({
        nextUserId: newNextUserId,
        nextTurnLeft: newNextTurnLeft,
        newNextUserId: -1,
        newNextTurnLeft: 0,
        cardUserId: -1,
        usingEffectCard: Card.backCard,
        canNope: false,
      });
      switch (usingEffectCard) {
        case Card.attack:
          if (cardUserId === userId) this.useEffect(userId, usingEffectCard);
          break;
        case Card.skip:
          if (cardUserId === userId) this.useEffect(userId, usingEffectCard);
          break;
        case Card.favor:
          this.setState({
            cardSelectorId: newCardSelectorId,
            newCardSelectorId: -1,
          });
          break;
        case Card.seeTheFuture:
          if (cardUserId === userId) this.useEffect(userId, usingEffectCard);
          break;
        default:
          this.useEffect(userId, usingEffectCard);
      }
    });
  }

  // --------- end componentDidMount() ---------

  getPropsFromUserId = (userId) => {
    const userIdx = this.findUserIdx(userId);
    const data = {
      roomId: this.state.roomId,
      createdTime: this.state.createdTime,
      leftCardNumber: this.state.leftCardNumber,
      nextUserId: this.state.nextUserId,
      nextTurnLeft: this.state.nextTurnLeft,
      discardPile: this.state.discardPile,
      usersData: this.state.usersData,
    };
    if (this.state.usersData[userIdx]?.userCards && userIdx >= 0)
      data.userCards = this.state.usersData[userIdx].userCards[userIdx];
    return data;
  };

  getUserCard = (userId) => {
    const userIdx = this.findUserIdx(userId);
    if (this.state.usersData[userIdx]?.userCards && userIdx >= 0)
      return this.state.usersData[userIdx].userCards;
    return [];
  };

  findUserIdx = (userId) => {
    const { usersData } = this.state;
    let idx = -1;
    usersData.forEach((userData, curIdx) => {
      if (userData.userId === userId) idx = curIdx;
    });
    return idx;
  };

  createCustomRoom = (userId) => {
    const data = {
      userId, // Room creator's ID
    };
    this.state.socket.emit("create-custom-room", data);
  };

  joinCustomRoom = (userId) => {
    const data = {
      userId,
      roomId: this.state.roomId,
    };
    this.state.socket.emit("join-custom-room", data);
  };

  drawCard = (userId) => {
    const data = {
      userId,
      roomId: this.state.roomId,
    };
    if (userId !== this.state.nextUserId || this.state.canNope) return;
    console.log(userId, this.state.nextUserId);
    this.state.socket.emit("draw-card", data);
  };

  startGame = () => {
    const data = {
      roomId: this.state.roomId,
    };
    this.state.socket.emit("start-game", data);
  };

  useCard = (userId, cardIdx) => {
    const userCards = this.getUserCard(userId);
    const card = userCards[cardIdx];
    const data = {
      userId,
      roomId: this.state.roomId,
      card,
      cardIdx,
    };
    this.state.socket.emit("use-card", data);
  };

  selectFavorCard = (userId, targetId, card) => {
    const data = {
      userId,
      roomId: this.state.roomId,
      targetId,
      card,
    };
    this.state.socket.emit("select-favor-card", data);
  };

  useCommon2 = (userId, cardsIdx) => {
    const { usersData, roomId } = this.state;
    const userIdx = this.findUserIdx(userId);
    const cards = cardsIdx.map(
      (cardIdx) => usersData[userIdx].userCards[cardIdx]
    );

    // two of a kind, can be any cards e.g. two of a common cat, two of skip
    if (cardsIdx.length !== 2) return;
    if (cards[0] !== cards[1]) return;

    const data = {
      userId,
      roomId,
      cards,
      cardsIdx,
    };
    this.state.socket.emit("use-common-2", data);
  };

  chooseTargetCard = (targetId) => {
    alert("chosse card from " + targetId);
    return 0; // todo:
  };

  selectCommon2 = (userId, targetId, targetCardIdx) => {
    const { usersData, roomId } = this.state;
    const targetCard = usersData[targetId].userCards[targetCardIdx];
    const data = {
      userId,
      roomId,
      targetId,
      targetCard,
      targetCardIdx,
    };
    this.state.socket.emit("select-common-2", data);
  };

  useCommon3 = (userId, cardsIdx) => {
    const { usersData, roomId } = this.state;

    const userIdx = this.findUserIdx(userId);
    const cards = cardsIdx.map(
      (cardIdx) => usersData[userIdx].userCards[cardIdx]
    );

    if (cardsIdx.length !== 3) return;
    if (cards[0] !== cards[1] || cards[0] !== cards[2]) return;

    const data = {
      userId,
      roomId,
      cards,
      cardsIdx,
    };
    this.state.socket.emit("use-common-3", data);
  };

  selectCommon3 = (userId, targetId, targetCardIdx) => {
    const { usersData, roomId } = this.state;
    const targetCard = usersData[targetId].userCards[targetCardIdx];
    const data = {
      userId,
      roomId,
      targetId,
      targetCardIdx,
    };
    this.state.socket.emit("select-common-3", data);
  };

  useCommon5 = (userId, cardsIdx) => {
    const { usersData, roomId } = this.state;
    const userIdx = this.findUserIdx(userId);
    const cards = cardsIdx.map(
      (cardIdx) => usersData[userIdx].userCards[cardIdx]
    );

    if (cardsIdx.length !== 5) return;
    cards.sort();
    for (let i = 0; i < 4; i++) {
      if (cards[i] === cards[i + 1]) return;
    }

    const data = {
      userId,
      roomId,
      cards,
      cardsIdx,
    };
    this.state.socket.emit("use-common-5", data);
  };

  selectCommon5 = (userId, selectCardIdx) => {
    const { discardPile } = this.state;
    const selectCard = discardPile[selectCardIdx];
    const data = {
      userId,
      roomId: this.state.roomId,
      selectCard,
      selectCardIdx,
    };
    this.state.socket.emit("select-common-5", data);
  };

  drawExplodingPuppy = (userId) => {
    const data = {
      userId,
      roomId: this.state.roomId,
    };
    this.state.socket.emit("draw-exploding-puppy", data);
  };

  insertExplodingPuppy = (userId, idx) => {
    const data = {
      userId,
      roomId: this.state.roomId,
      idx,
    };
    this.state.socket.emit("insert-exploding-puppy", data);
  };

  gameLose = (userId) => {
    const data = {
      userId,
      roomId: this.state.roomId,
    };
    this.state.socket.emit("game-lose", data);
  };

  handleUseCard = (userId, cardsIdx) => {
    switch (cardsIdx.length) {
      case 1:
        this.useCard(userId, cardsIdx[0]);
        break;
      case 2:
        this.useCommon2(userId, cardsIdx);
        break;
      case 3:
        this.useCommon3(userId, cardsIdx);
        break;
      case 5:
        this.useCommon5(userId, cardsIdx);
        break;
      default:
        return;
    }
  };

  sendMessageRoom = (fromUserId, fromRoomId, fromUsername, message) => {
    let data = {
      fromUserId: fromUserId,
      fromRoomId: fromRoomId,
      fromUsername: fromUsername,
      message: message,
    };
    this.state.socket.emit("message-send-room", data);
  };

  useEffect = (userId, card) => {
    const data = {
      userId,
      roomId: this.state.roomId,
      card,
    };
    console.log("useEffect", data);
    this.newCountDown(timePerTurn);
    this.state.socket.emit("use-effect", data);
  };

  closeSeeTheFutureDialog = () => {
    this.setState({ seeTheFutureId: -1, seeTheFutreCard: [] });
  };

  selectPlayer = (userId, targetId) => {
    const { roomId, usingEffectCard } = this.state;
    const data = {
      userId,
      roomId: roomId,
      targetId,
      card: usingEffectCard,
    };
    this.setState({ isSelectingPlayerId: -1 });
    this.state.socket.emit("select-player", data);
  };

  setSelectedCardIdx = (userId, selectedCardIdx) => {
    const { usingEffectCard, targetId, roomId } = this.state;
    const data = {
      userId,
      roomId,
      card: usingEffectCard,
      targetId,
    };
    this.setState({ cardSelectorId: -1, usingEffectCard: Card.backCard });
    switch (usingEffectCard) {
      case Card.favor:
        data.favorCardIdx = selectedCardIdx;
        data.userId = targetId;
        data.targetId = userId;
        this.state.socket.emit("use-effect", data);
        break;
      case Card.common2:
        data.targetCardIdx = selectedCardIdx;
        this.state.socket.emit("select-common-2", data);
        break;
      case Card.common3:
        data.selectCard = allSelectableCards[selectedCardIdx];
        this.state.socket.emit("select-common-3", data);
        break;
      case Card.common5:
        data.selectCardIdx = selectedCardIdx;
        this.state.socket.emit("select-common-5", data);
        break;
    }
  };

  hasDefuse = (userId) => {
    const userIdx = this.findUserIdx(userId);
    const { usersData } = this.state;
    if (userIdx === -1) return 0;
    if (!usersData[userIdx].userCards) return 0;
    const defuseIdx = usersData[userIdx].userCards.indexOf(Card.defuse);
    if (defuseIdx !== -1) return 1;
    return 0;
  };

  handleUseNope = (userId) => {
    const data = {
      userId,
      roomId: this.state.roomId,
    };
    this.newCountDown(timePerTurn);
    this.state.socket.emit("use-nope", data);
  };

  newCountDown = (second) => {
    this.setState({ countDownTime: Date.now() + second * 1000 });
    console.log(this.state.countDownTime);
  };

  render() {
    // const classes = useStyles();
    const roomId = "100001";

    const {
      socket,
      explodeId,
      seeTheFutureId,
      seeTheFutureCards,
      discardPile,
      isSelectingPlayerId,
      cardSelectorId,
      cardSelectorCards,
      usersData,
      leftCardNumber,
      nextUserId,
      showCardSelectorBackCard,
      canNope,
      countDownTime,
    } = this.state;
    const userId = window.sessionStorage.getItem("userId"); // todo:
    const userIdx = this.findUserIdx(userId);
    let userCards = [];
    if (
      this.state.usersData.length > userIdx &&
      userIdx !== -1 &&
      this.state.usersData[userIdx].userCards
    ) {
      userCards = this.state.usersData[userIdx].userCards;
    }
    return (
      <div
        style={{
          height: "100vh",
          width: "100vw",
          maxWidth: "100%",
          background: Palette.yellow100,
        }}
      >
        <Chat
          roomId={roomId}
          socket={this.state.socket}
          sendMessageRoom={this.sendMessageRoom}
          usersData={usersData}
        />
        <Game
          socket={socket}
          createCustomRoom={this.createCustomRoom}
          joinCustomRoom={this.joinCustomRoom}
          startGame={this.startGame}
          getPropsFromUserId={this.getPropsFromUserId}
          userCards={userCards}
          drawCard={this.drawCard}
          hasDefuse={this.hasDefuse}
          explodeId={explodeId}
          insertExplodingPuppy={this.insertExplodingPuppy}
          handleUseCard={this.handleUseCard}
          seeTheFutureId={seeTheFutureId}
          seeTheFutureCards={seeTheFutureCards}
          closeSeeTheFutureDialog={this.closeSeeTheFutureDialog}
          gameLose={this.gameLose}
          topDiscardPile={discardPile[discardPile.length - 1]}
          isSelectingPlayerId={isSelectingPlayerId}
          selectPlayer={this.selectPlayer}
          cardSelectorId={cardSelectorId}
          setSelectedCardIdx={this.setSelectedCardIdx}
          cardSelectorCards={cardSelectorCards}
          usersData={usersData}
          numberOfDeckCards={leftCardNumber}
          nextUserId={nextUserId}
          showCardSelectorBackCard={showCardSelectorBackCard}
          canNope={canNope}
          handleUseNope={this.handleUseNope}
          countDownTime={countDownTime}
          newCountDown={this.newCountDown}
        />
      </div>
    );
  }
}

export default Gameplay;