import React, { useEffect, useState } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";
import axios from "axios";
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  fade,
  InputAdornment,
  InputBase,
  Link,
  makeStyles,
  Slider,
  Switch,
  Toolbar,
  Tooltip,
  Typography,
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";

const useStyles = makeStyles((theme) => ({
  home: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
  },
  grow: {
    flexGrow: 1,
  },
  title: {
    display: "none",
    [theme.breakpoints.up("sm")]: {
      display: "block",
    },
  },
  search: {
    position: "relative",
    borderRadius: theme.shape.borderRadius,
    backgroundColor: fade(theme.palette.common.white, 0.15),
    "&:hover": {
      backgroundColor: fade(theme.palette.common.white, 0.25),
    },
    marginRight: theme.spacing(2),
    marginLeft: 0,
    width: "100%",
    [theme.breakpoints.up("sm")]: {
      marginLeft: theme.spacing(3),
      width: "auto",
    },
  },
  searchIcon: {
    padding: theme.spacing(0, 2),
    height: "100%",
    position: "absolute",
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  inputRoot: {
    color: "inherit",
  },
  inputAdornment: {
    marginTop: "-3px",
    paddingLeft: `calc(1em + ${theme.spacing(4)}px)`,
  },
  inputInput: {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    marginLeft: "-2px",
    transition: theme.transitions.create("width"),
    width: "100%",
    [theme.breakpoints.up("md")]: {
      width: "20ch",
    },
  },
  slider: {
    marginRight: theme.spacing(2),
    marginLeft: theme.spacing(2),
    width: "100%",
    [theme.breakpoints.up("md")]: {
      width: "15ch",
    },
    textAlign: "center",
  },
  sliderRoot: {
    color: fade(theme.palette.common.white, 0.15),
    "&:hover": {
      color: fade(theme.palette.common.white, 0.25),
    },
  },
  sliderThumb: {
    color: theme.palette.common.white,
  },
  sliderWarning: {
    color: theme.palette.warning.main,
  },
  switch: {
    display: "flex",
    alignItems: "center",
    marginRight: theme.spacing(2),
    marginLeft: theme.spacing(2),
    textAlign: "center",
  },
  button: {
    position: "relative",
    marginRight: theme.spacing(2),
    marginLeft: theme.spacing(2),
  },
  footer: {
    padding: theme.spacing(3, 2),
    marginTop: "auto",
    backgroundColor:
      theme.palette.type === "light"
        ? theme.palette.grey[200]
        : theme.palette.grey[800],
  },
  footerText: {
    textAlign: "center",
    "& > * + *": {
      marginLeft: theme.spacing(2),
    },
  },
  textAlignCenter: {
    textAlign: "center",
  },
}));

function getDialogContent(type: "about" | "why") {
  switch (type) {
    case "about":
      return (
        <>
          <DialogTitle>About us!</DialogTitle>
          <DialogContent>
            We are two students, Mathis and Thomas, from the north of France, in our first year of cybersecurity master's degree.<br/>
            <br/>
            You can find our GitHub here:<br/>
            <Link href={"https://github.com/MathisEngels"}>Mathis Engels</Link><br/>
            <Link href={"https://github.com/radikaric"}>Thomas Bauduin</Link><br/>
            <br/>
            Thanks for looking us up.
          </DialogContent>
        </>
      );
    case "why":
      return (
        <>
          <DialogTitle>Why did we make this?</DialogTitle>
          <DialogContent>
            As part of our first year of our cybersecurity master's degree, we had to make something about security for our semester project.<br/>
            We decided to create a profiling tool for Twitter.<br/>
            <br/>
            It makes us realize how volatile our data is, how easy it can be fetched (with neat tricks) and how we can exploit it.<br/>
            Also, making it visualize is kinda fun and you can learn a lot about yourself and/or your target(s).<br/>
          </DialogContent>
        </>
      );
    default:
      return <></>;
  }
}
function getLoadingCounter(
  lastTime: number,
  data: { timeStart: number; timeAvg: number }
): number {
  return Math.floor((lastTime - data.timeStart) / data.timeAvg);
}

export default function Home() {
  const NoSSRForceGraph = dynamic(() => import("../lib/noSSRForceGraph"), {
    ssr: false,
  });
  const classes = useStyles();

  const [target, setTarget] = useState<string>("");
  const [tweetLimit, setTweetLimit] = useState<number>(50);
  const [relationLimit, setRelationLimit] = useState<number>(15);
  const [depth, setDepth] = useState<number>(2);
  const [dialogData, setDialogData] = useState<{
    state: boolean;
    type: "about" | "why" | "loading" | null;
  }>({ state: false, type: null });
  const [graphSize, setGraphSize] = useState<{ height: number; width: number }>(
    { height: 0, width: 0 }
  );
  const [data, setData] = useState<{ nodes: []; links: [] }>({
    nodes: [],
    links: [],
  });
  const [animationState, setAnimationState] = useState<boolean>(true);

  const [loadingData, setLoadingData] = useState<{
    relations: number;
    timeAvg: number;
    timeStart: number;
    error: string;
  }>({ relations: 0, timeAvg: 0, timeStart: 0, error: "" });
  const [loadingTime, setLoadingTime] = useState<number>(0);
  const [loadingState, setLoadingState] = useState<boolean>(false);
  const [loadingInterval, setLoadingInterval] = useState(null);

  useEffect(() => {
    function updateSize() {
      // Minus header minus footer
      setGraphSize({
        height: window.innerHeight - 64 - 72,
        width: window.innerWidth,
      });
    }
    window.addEventListener("resize", updateSize);
    updateSize();
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    if (loadingState && loadingData.timeAvg > 0 && loadingTime === 0) {
      const interval = setInterval(() => {
        tickLoading();
      }, 1000);

      setLoadingInterval(interval);
    }
  }, [loadingData.timeAvg]);
  useEffect(() => {
    if (!loadingState) {
      clearLoading();
    }
  }, [loadingState]);

  const tickLoading = () => {
    if (getLoadingCounter(loadingTime, loadingData) > loadingData.relations) {
      clearInterval(loadingInterval);
      setLoadingInterval(null);
    } else if (loadingState) {
      setLoadingTime(Date.now());
    }
  };
  const clearLoading = () => {
    clearLoadingInterval();
    setLoadingData({
      relations: 0,
      timeAvg: 0,
      timeStart: 0,
      error: "",
    });
    setLoadingTime(0);
  };
  const clearLoadingInterval = () => {
    clearInterval(loadingInterval);
    setLoadingInterval(null);
  };

  const requestData = (
    _target: string,
    _tweetLimit: number,
    _relationLimit: number,
    _depth: number
  ): void => {
    wipeData();
    setDialogData({ state: true, type: "loading" });
    setLoadingState(true);

    axios
      .get(
        `/api/search?target=${_target}&tweetLimit=${_tweetLimit}&relationLimit=${_relationLimit}&depth=${_depth}`
      )
      .then(function (response) {
        setData(response.data.data);
        setLoadingState(false);
        setDialogData({ ...dialogData, state: false });
      })
      .catch(function (error) {
        clearLoadingInterval();
        setLoadingData({
          relations: 0,
          timeAvg: 0,
          timeStart: 0,
          error: error.response.data.error || error.response.error.toString(),
        });
      });

    if (depth === 2) {
      axios
        .get(
          `/api/stats?target=${target}&tweetLimit=${tweetLimit}&relationLimit=${_relationLimit}`
        )
        .then(function (response) {
          setLoadingData({
            relations: Number(response.data.numberOfMentions),
            timeAvg: Number(
              Number(response.data.avgTimePerMentions).toFixed(2)
            ),
            timeStart: Date.now(),
            error: "",
          });
        })
        .catch(function (error) {});
    }
  };
  const wipeData = (): void => {
    if (data?.nodes?.length > 0) {
      setData({ nodes: [], links: [] });
    }
  };
  const graphTooltip = (node) => {
    if (node.bestStr && node.bestVal) {
      return `<div style="margin: 0 8px; max-width: 20vw">
            <h2>@${node.name}</h2>
            <div>Best relation: <b>@${node.bestStr}</b> with <b>${node.bestVal}</b> interactions.</div>
            <p>Double click to run a search on @${node.name}.</p>
          </div>
          `;
    }
    return `<div style="margin: 0 8px; max-width: 20vw">
            <h2>@${node.name}</h2>
            <p>Double click to run a search on @${node.name}.</p>
          </div>
          `;
  };
  let lastClick = 0;
  const onNodeClick = (node, event) => {
    if (event.timeStamp - lastClick <= 500) {
      setTarget(node.name);
      requestData(node.name, tweetLimit, relationLimit, depth);
    } else {
      lastClick = event.timeStamp;
    }
  };

  const handleTargetChange = (event) => {
    wipeData();
    setTarget(event.target.value);
  };
  const handleTargetKeyPress = (event) => {
    if (event.keyCode == 13) {
      requestData(event.target.value, tweetLimit, relationLimit, depth);
    }
  };
  const handleTweetLimitChange = (_, value: number): void => {
    setTweetLimit(value);
    wipeData();
  };
  const handleRelationLimitChange = (_, value: number): void => {
    setRelationLimit(value);
    wipeData();
  };
  const onClickSearch = (): void => {
    requestData(target, tweetLimit, relationLimit, depth);
  };
  const handleDepthChange = (): void => {
    setDepth(depth === 1 ? 2 : 1);
    wipeData();
  };
  const handleAnimationStateChange = (): void => {
    setAnimationState(!animationState);
  };
  const onClickAbout = (): void => {
    setDialogData({ state: true, type: "about" });
  };
  const onClickWhy = (): void => {
    setDialogData({ state: true, type: "why" });
  };
  const handleDialogClose = (): void => {
    setDialogData({ ...dialogData, state: false });
  };
  const handleDialogLoadingClose = (): void => {
    handleDialogClose();
    clearLoading();
  };

  return (
    <div className={classes.home}>
      <Head>
        <title>Twitter Network Profiler</title>
        <meta
          name="description"
          content="Twitter network profiler visualizer"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <AppBar position={"static"}>
        <Toolbar>
          <Typography className={classes.title} variant={"h6"} noWrap>
            Twitter network profiler
          </Typography>
          <div className={classes.grow} />
          <Tooltip
            title={"Your target. The search will be based on this user."}
            arrow
          >
            <div className={classes.search}>
              <div className={classes.searchIcon}>
                <SearchIcon />
              </div>
              <InputBase
                placeholder={"John"}
                startAdornment={
                  <InputAdornment
                    position={"start"}
                    disableTypography
                    classes={{ root: classes.inputAdornment }}
                  >
                    @
                  </InputAdornment>
                }
                classes={{
                  root: classes.inputRoot,
                  input: classes.inputInput,
                }}
                inputProps={{ "aria-label": "search" }}
                onChange={handleTargetChange}
                onKeyDown={handleTargetKeyPress}
                value={target}
              />
            </div>
          </Tooltip>
          <Tooltip
            title={`Sample size. It'll retrieve the last ${tweetLimit} tweets of targets.`}
          >
            <div className={classes.slider}>
              <Slider
                classes={{
                  root: classes.sliderRoot,
                  thumb: classes.sliderThumb,
                }}
                value={tweetLimit}
                onChange={handleTweetLimitChange}
                min={50}
                max={250}
              />
              <Typography>{tweetLimit} Tweets.</Typography>
            </div>
          </Tooltip>
          <Tooltip
            title={`The maximum number of relations per targets. Only the top ${relationLimit} relations will be shown. 
            Warning: Above 35 relations, you will probably experience lags.`}
          >
            <div className={classes.slider}>
              <Slider
                classes={{
                  root: classes.sliderRoot,
                  thumb:
                    relationLimit < 34
                      ? classes.sliderThumb
                      : classes.sliderWarning,
                }}
                value={relationLimit}
                onChange={handleRelationLimitChange}
                min={2}
                max={50}
              />
              <Typography
                className={
                  relationLimit < 34
                    ? classes.sliderThumb
                    : classes.sliderWarning
                }
              >
                {relationLimit} Relations.
              </Typography>
            </div>
          </Tooltip>
          <Tooltip title={"Enable depth 2 search."}>
            <div className={classes.switch}>
              <Switch checked={depth === 2} onChange={handleDepthChange} />
              <Typography noWrap>Depth 2</Typography>
            </div>
          </Tooltip>
          <Tooltip title={"Enable animation."}>
            <div className={classes.switch}>
              <Switch
                checked={animationState}
                onChange={handleAnimationStateChange}
              />
              <Typography variant={"body1"} noWrap>
                Animation
              </Typography>
            </div>
          </Tooltip>
          <Button
            variant={"contained"}
            className={classes.button}
            onClick={onClickSearch}
            disabled={target === ""}
          >
            Search
          </Button>
        </Toolbar>
      </AppBar>
      <main>
        <NoSSRForceGraph
          graphData={data}
          height={graphSize.height}
          width={graphSize.width}
          nodeLabel={graphTooltip}
          onNodeClick={onNodeClick}
          linkDirectionalParticles={animationState ? 1 : 0}
        />
      </main>
      <footer className={classes.footer}>
        <Container maxWidth="sm">
          <Typography variant="body1" className={classes.footerText}>
            <Link onClick={onClickAbout} href={"#"}>
              About us
            </Link>
            <span>·</span>
            <Link onClick={onClickWhy} href={"#"}>
              Why did we make this
            </Link>
            <span>·</span>
            <Link href={"/report.pdf"}>Report</Link>
          </Typography>
        </Container>
      </footer>
      <Dialog
        open={dialogData.state}
        onClose={
          dialogData.type !== "loading"
            ? handleDialogClose
            : handleDialogLoadingClose
        }
        disableBackdropClick={
          dialogData.type === "loading" && loadingData.error === ""
        }
        disableEscapeKeyDown={
          dialogData.type === "loading" && loadingData.error === ""
        }
      >
        {dialogData.type !== "loading" ? (
            <>
              {getDialogContent(dialogData.type)}
              <DialogActions>
                <Button onClick={handleDialogClose} color="primary">
                  Close
                </Button>
              </DialogActions>
            </>
        ) : (
          <div className={classes.textAlignCenter}>
            <DialogTitle>Searching @{target}...</DialogTitle>
            <DialogContent>
              {loadingData.error === "" ? (
                <>
                  <Box position="relative" display="inline-flex">
                    {loadingData.timeStart !== 0 && loadingTime !== 0 ? (
                      <CircularProgress
                        variant={"determinate"}
                        size={100}
                        value={Math.min(
                          (getLoadingCounter(loadingTime, loadingData) * 100) /
                            loadingData.relations,
                          100
                        )}
                      />
                    ) : (
                      <CircularProgress variant={"indeterminate"} size={100} />
                    )}
                    <Box
                      top={0}
                      left={0}
                      bottom={0}
                      right={0}
                      position="absolute"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <Typography component="div">
                        {loadingData.timeStart !== 0 && loadingTime !== 0
                          ? `${Math.min(
                              getLoadingCounter(loadingTime, loadingData),
                              loadingData.relations
                            )} / ${loadingData.relations}`
                          : "0/1"}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography variant={"h6"}>
                    Estimated time left:{" "}
                    {loadingData.timeStart !== 0 &&
                    loadingTime !== 0 &&
                    getLoadingCounter(loadingTime, loadingData) <
                      loadingData.relations
                      ? `~${(
                          (loadingData.timeAvg * loadingData.relations -
                            getLoadingCounter(loadingTime, loadingData) *
                              loadingData.timeAvg) /
                          1000
                        ).toFixed(1)}s`
                      : "In few seconds"}
                  </Typography>
                  <br />
                </>
              ) : (
                <>
                  <Typography variant={"body1"}>An error occurred:</Typography>
                  <Typography variant={"h6"}>{loadingData.error}</Typography>
                </>
              )}
              <Typography variant={"caption"}>
                Target: {target} · Tweet limit: {tweetLimit} · Relation limit:{" "}
                {relationLimit} · Depth: {depth}
              </Typography>
              {loadingData.timeStart !== 0 &&
                loadingTime !== 0 &&
                loadingData.error === "" && (
                  <>
                    <br />
                    <Typography variant={"caption"}>
                      Relations: {loadingData.relations} · Avg time/rel:{" "}
                      {loadingData.timeAvg}ms
                    </Typography>
                  </>
                )}
            </DialogContent>
            {loadingData.error !== "" && (
              <DialogActions>
                <Button onClick={handleDialogLoadingClose} color="primary">
                  Close
                </Button>
              </DialogActions>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
