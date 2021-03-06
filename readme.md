# GBIF Taxonomic Browser
A simple taxonomic browser for the [GBIF Backbone Taxonomy](http://www.gbif.org/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c)
or any other ChecklistBank checklist. 

The [browser is setup on github pages](http://mdoering.github.io/nub-browser/app/#/)  to brwose the current live GBIF backbone.

## Run locally
### Install Dependencies

We have two kinds of dependencies in this project: tools and angular framework code.  The tools help us manage the application.

* We get the tools we depend upon via `npm`, the [node package manager][npm]. On oSX install npm via `brew install node`.
* We get the angular code via `bower`, a [client-side code package manager][bower].

We have preconfigured `npm` to automatically run `bower` so we can simply do:

```
npm install
```

Behind the scenes this will also call `bower install`.  You should find that you have two new
folders in your project.

* `node_modules` - contains the npm packages for the tools we need
* `app/bower_components` - contains the angular framework files

*Note that the `bower_components` folder would normally be installed in the root folder but
angular-seed changes this location through the `.bowerrc` file.  Putting it in the app folder makes
it easier to serve the files by a webserver.*

### Run the Application

We have preconfigured the project with a simple development web server.  The simplest way to start
this server is:

```
npm start
```

Now browse to the app at `http://localhost:8000/app`.


