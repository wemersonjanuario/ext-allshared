## @sencha/ext-react-{toolkit}{bundle}

last run: {now}

This npm package contains the needed files to add the @sencha/ext-react-{toolkit}{bundle} package to a React application

## Login to the Sencha early adopter npm repo

```sh
npm login --registry=https://sencha.myget.org/F/early-adopter/npm/ --scope=@sencha

```

## Create a React application with create-react-app

- Run the following:

```sh
npx create-react-app ext-react-demo-{toolkit}{bundle}
```

- Add ExtReact to your application by running the following:

```sh
cd ext-react-demo-{toolkit}{bundle}
npm install @sencha/ext-react-{toolkit}{bundle} --save
```

- Open your editor

To open Visual Studio Code, type the following:

```sh
code .
```

(You can use any editor)

#### Add ExtReact to your project

- Replace ./src/App.js with:

```sh
import React, { Component } from 'react';
import { ExtPanel, ExtToolbar, ExtButton, ExtGrid, ExtColumn } from "@sencha/ext-react-{toolkit}";

class App extends Component {

  render() {
    return (
      <ExtPanel
        title="Panel"
        layout="fit"
        shadow="true"
        viewport="true"
        padding="10"
      >
        <ExtToolbar docked="top">
          <ExtButton text="button1"></ExtButton>
          <div>div with text</div>
          <ExtButton text="button2"></ExtButton>
        </ExtToolbar>
        <ExtGrid title="The Grid" shadow="true" onReady={ this.readyGrid }>
          <ExtColumn text="name" dataIndex="name"></ExtColumn>
          <ExtColumn text="email" dataIndex="email" flex="1"></ExtColumn>
        </ExtGrid>
      </ExtPanel>
    )
  }

  readyGrid = detail => {
    var grid = detail.cmp;
    var data=[
      {name: 'Marc', email: 'marc@gmail.com'},
      {name: 'Nick', email: 'nick@gmail.com'},
      {name: 'Andy', email: 'andy@gmail.com'}
    ]
    grid.setData(data);
  }

}
export default App;

```

- Type the following in a command/terminal window:

```sh
npm start
```

The ExtReact application will load in a browser window