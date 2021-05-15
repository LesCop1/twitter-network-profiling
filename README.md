# TNP - Twitter network profiler
Twitter network profiler is a web app allowing you to see the relations around your target's Twitter. 
It allows you, to see depth 2 relations, therefore a more global view around your target and learn more information about them. 
You can identify networks more easily.


## Prerequisites
Before you begin, ensure you have met the following requirements:
- You have installed [Node (LTS version)]("https://nodejs.org/en/"), [Python3]("https://www.python.org/downloads/"), and [Git]("https://git-scm.com/downloads"). You can check if you have them installed by typing:
```bash
$ node --version
v14.5.5

$ python --version
Python 3.9.4

$ git --version
git version 2.19.1
```
- You have a Windows machine.
> This is due to NextJS having trouble running on Linux machines.
## Installing TNP
To install TNP, follow these steps:
- Clone the repo:
```bash
git clone https://github.com/LesCop1/twitter-network-profiling
```
- Install NPM dependencies:
```bash
cd twitter-network-profiling
npm i
```

- Build the web app:
```bash
npm run build
```

## Using TNP
First, start the web app:
```bash
npm run start
```
Open [http://localhost:3000](http://localhost:3000) with your browser to access TNP.

You can start profiling users as you want. Enjoy! 🥳

## Warnings
TNP uses Python scripts in parallel to fetch users' data fast.
The more relations you try to fetch, the more scripts will be executed in parallel. 
There is no limitation on how many scripts can run in parallel, so make sure you take it easy and increase the number of relations step by step.
