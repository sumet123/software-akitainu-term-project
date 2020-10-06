import React, { useState } from "react";
import { makeStyles } from "@material-ui/core";
import { Card, getCardImage } from "../../../components/type";
import card_back from "../../../image/card_back.png";
import PlayerHand from "../PlayerHand";
import SeeTheFutureDialog from "../SeeTheFutureDialog";
import CardSelectorDialog from "../CardSelectorDialog";
import ExplodingPuppyDialog from "../ExplodingPuppyDialog";
import Otherhand from "../Otherhand";
import CustomRoom from "../../../components/CustomRoom";
import { gameTestData } from "./mock";

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
    height: "calc(100% - 64px)",
    backgroundColor: "#522A00",
  },

  topSection: {
    width: "100%",
    height: "20%",
    display: "flex",
    justifyContent: "center",
  },

  middleSection: {
    width: "100%",
    height: "50%",
    display: "flex",
  },

  bottomSection: {
    width: "100%",
    height: "30%",
    overflow: "hidden",
  },

  middlePlayerSection: {
    width: "20%",
    height: "100%",
    display: "flex",
    flexDirection: "column-reverse",
    justifyContent: "center",
  },

  playArea: {
    width: "60%",
    height: "100%",
    display: "flex",
  },

  topPlayerWrapper: {
    height: "100%",
    width: "20%",
    backgroundColor: "lightblue", //tmp
  },

  middlePlayerWrapper: {
    height: "45%",
    width: "100%",
    backgroundColor: "lightblue", //tmp
  },

  cardWrapper: {
    width: "25%",
    height: "100%",
    backgroundColor: "yellow", //tmp
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  log: {
    width: "50%",
    height: "100%",
    backgroundColor: "green", //tmp
  },

  deck: {
    height: "250px",
    cursor: "pointer",
    borderRadius: "16px",
    boxShadow: theme.shadows[5],
  },

  usedCard: {
    height: "250px",
    borderRadius: "16px",
    boxShadow: theme.shadows[5],
  },
}));

function Game(props) {
  const classes = useStyles();
  const customRoom = new CustomRoom({ userId: 1 });
  const [showSeeTheFutureDialog, setShowSeeTheFutureDialog] = useState(false);
  const [showCardSelectorDialog, setShowCardSelectorDialog] = useState(false);
  const [showExplodingPuppyDialog, setShowExplodingPuppyDialog] = useState(
    false
  );
  console.log(customRoom.getPropsFromUserId(1));

  const {
    playerCards,
    seeTheFutureCards,
    latestUsedCard,
    users,
    cardSelectorCards,
  } = gameTestData; //mock data

  const hasDefuse = () => {
    for (let i = 0; i < playerCards.length; i++) {
      if (playerCards[i] === Card.defuse) return true;
    }
    return false;
  };

  return (
    <>
      <div className={classes.root}>
        <div className={classes.topSection}>
          <div className={classes.topPlayerWrapper}>
            <Otherhand user={gameTestData.users[0]} />
          </div>
          <div style={{ width: "5%" }} />
          <div className={classes.topPlayerWrapper}>
            <Otherhand user={gameTestData.users[1]} />
          </div>
          <div style={{ width: "5%" }} />
          <div className={classes.topPlayerWrapper}>
            <Otherhand user={gameTestData.users[2]} />
          </div>
        </div>
        <div className={classes.middleSection}>
          <div className={classes.middlePlayerSection}>
            <div className={classes.middlePlayerWrapper}>
              <Otherhand user={gameTestData.users[3]} />
            </div>
            <div style={{ height: "5%" }} />
            <div className={classes.middlePlayerWrapper}>
              <Otherhand user={gameTestData.users[0]} />
            </div>
          </div>
          <div className={classes.playArea}>
            <div className={classes.cardWrapper}>
              <img
                src={card_back}
                className={classes.deck}
                onClick={() => alert("draw card")}
              />
            </div>
            <div className={classes.cardWrapper}>
              <img
                src={getCardImage(latestUsedCard)}
                className={classes.usedCard}
              />
            </div>
            <div className={classes.log}>
              <div onClick={() => setShowSeeTheFutureDialog(true)}>
                test stf
              </div>
              <div onClick={() => setShowCardSelectorDialog(true)}>
                test cardSelector
              </div>
              <div onClick={() => setShowExplodingPuppyDialog(true)}>
                test exploding
              </div>
            </div>
          </div>
          <div className={classes.middlePlayerSection}>
            <div className={classes.middlePlayerWrapper}>
              <Otherhand user={gameTestData.users[0]} />
            </div>
            <div style={{ height: "5%" }} />
            <div className={classes.middlePlayerWrapper}>
              <Otherhand user={gameTestData.users[0]} />
            </div>
          </div>
        </div>
        <div className={classes.bottomSection}>
          <PlayerHand cards={playerCards} />
        </div>
      </div>
      <SeeTheFutureDialog
        open={showSeeTheFutureDialog}
        handleClose={() => setShowSeeTheFutureDialog(false)}
        seeTheFutureCards={seeTheFutureCards}
      />
      <CardSelectorDialog
        open={showCardSelectorDialog}
        handleClose={() => setShowCardSelectorDialog(false)}
        cardSelectorCards={cardSelectorCards}
      />
      <ExplodingPuppyDialog
        open={showExplodingPuppyDialog}
        handleClose={() => setShowExplodingPuppyDialog(false)}
        hasDefuse={hasDefuse()}
      />
    </>
  );
}
export default Game;
