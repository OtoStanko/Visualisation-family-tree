

//D3.js canvases
var textArea;
var mapArea;
var mapAreaWidth = 1520;//d3.select("#map_div").node().clientWidth

var svg;
var g;


var num_people;
var num_in_top_lvl;
var num_lvls;


// From the name of the person creates url for fetching the data from english wiki
const urlBuilder = (name) => {
    const fixedName = name.replaceAll(" ", "_")
    console.log(fixedName)
    const endPoint = "https://en.wikipedia.org/w/api.php";
    const wikiParams = [
        '?action=query',
        '&prop=revisions',
        '&titles=',
        fixedName,
        '&explaintext=1',
        '&rvprop=content',
        '&rvsection=0',
        '&format=json',
        '&formatversion=2',
        '&redirects',
        '&origin=*'
    ];

    return endPoint + wikiParams.join("");
}


function getImages() {
    var url = "https://en.wikipedia.org/w/api.php"; 

    var params = {
        action: "query",
        prop: "images",
        titles: "Elizabeth II",
        format: "json"
    };

    url = url + "?origin=*";
    Object.keys(params).forEach(function(key){url += "&" + key + "=" + params[key];});

    fetch(url)
        .then(function(response){return response.json();})
        .then(function(response) {
            var pages = response.query.pages;
            console.log(pages);
            for (var page in pages) {
                for (var img of pages[page].images) {
                    console.log(img.title);
                }
            }
        })
        .catch(function(error){console.log(error);});
}


const getBio = (string) => {
    const regex = / \(.*[0-9]*.* – .*\) /g;
    var bioText = string.match(regex);
    if (bioText != null) {
        return bioText[0].substring(2, bioText[0].length-2);
    }
    return "";
}


// From the content of the page extracts names of mother and father
const parseData = (string) => {
    //console.log(string);
    const regex = /father \s*= \[\[.*\]\]/g;
    var father = string.match(regex);
    if(father != null) {
        father = father[0].substring(father[0].indexOf("[") + 2, father[0].indexOf("]"))
        console.log(father)
    }
    var mother = string.match(/mother \s*= \[\[.*\]\]/g);
    if(mother != null) {
        mother = mother[0].substring(mother[0].indexOf("[") + 2, mother[0].indexOf("]"))
        console.log(mother)
    }
    //console.log(father, mother)
    return [mother, father]
}


// For a given url to the person's wiki recursively gets the predecessors
// How many predecessors may be limited by depth arg
// Each person is pushed to the "people" array
async function getJsonResponse(url, depth=2, predecessor_lvl=0, predecessor_in_lvl=0, predecessor) {
    if (depth <= 0) return;
    const res = await fetch(url).then((res) => res.json())
    if (res["query"]["pages"][0]["missing"]) return;

    var text = res["query"]["pages"][0]["revisions"][0]["content"]
    console.log(text);
    const [mother, father] = parseData(text);
    console.log(mother, father);
    var bio = getBio(text);
    console.log("Bio should be next:")
    console.log(bio);
    predecessor.bio = bio;

    var m_lvl = predecessor_lvl + 1;
    var m_in_lvl = predecessor_in_lvl * 2;
    people.push({
        name: mother,
        url: "",
        img: "",
        father: {},
        mother: {},
        lvl: m_lvl,
        in_lvl: m_in_lvl,
        male: false,
        bio: "",
    })
    var f_lvl = predecessor_lvl + 1;
    var f_in_lvl = predecessor_in_lvl * 2 + 1;
    people.push({
        name: father,
        url: "",
        img: "",
        father: {},
        mother: {},
        lvl: f_lvl,
        in_lvl: f_in_lvl,
        male: true,
        bio: "",
    })
    predecessor.mother = people[people.length - 2];
    predecessor.father = people[people.length - 1];
    //console.log(people)
    if(mother != null) {await getJsonResponse(urlBuilder(mother), depth-1, m_lvl, m_in_lvl, predecessor.mother)}
    if(father != null) {await getJsonResponse(urlBuilder(father), depth-1, f_lvl, f_in_lvl, predecessor.father)}
}


function getBaseLog(x, y) {
    return Math.log(y) / Math.log(x);
  }

// Main function for getting the data about the housetree
// Starts with Her Majesty Qeeen Elizabeth II
async function foo(depth=2) {
    const wikiLink = urlBuilder("Elizabeth II");
    people.push({
        name: "Elizabeth II",
        url: "",
        img: "",
        father: {},
        mother: {},
        lvl: 0,
        in_lvl: 0,
        male: false,
        bio: "",
    })
    //console.log(wikiLink)
    await getJsonResponse(wikiLink, depth, 0, 0, people[0])

    //console.log("RESULT:")
    console.log(people)

    num_people = people.length;
    //var num_in_top_lvl = (num_people + 1) / 2;
    num_in_top_lvl = Math.pow(2, people[people.length - 1].lvl);
    num_lvls = getBaseLog(2, num_people + 1);

    for (i = 0; i < num_people; i++) {
        if (people[i].name != null) {
            var xOffset = people[i].name.length * 3;
            let x_pos = (people[i].in_lvl + 0.5) * ((120 * num_in_top_lvl) / (Math.pow(2, people[i].lvl)) );
            if(people[i].mother.name != null && people[i].father.name != null) {
                createLines(g, people[i], people[i].mother, people[i].father);
            }
            createShield(g, x_pos, 150 * (num_lvls - people[i].lvl), people[i]);
            createName(g, x_pos - xOffset, 150 * (num_lvls - people[i].lvl) - 5, people[i].name)
        }
    }
}


var person = {
    name: "",
    url: "",
    img: "",
    father: {},
    mother: {},
    lvl: 0,
    in_lvl: 0,
    male: false,
}
var people = []
var visited = []
//people.push({})


function createLines(g, child, mother, father) {
    let x1 = (mother.in_lvl + 0.5) * ((120 * num_in_top_lvl) / (Math.pow(2, mother.lvl)) );
    let y1 = 150 * (num_lvls - mother.lvl) + 5;

    let x2 = (father.in_lvl + 0.5) * ((120 * num_in_top_lvl) / (Math.pow(2, father.lvl)) );
    let y2 = y1;

    let x3 = (x1 + x2 ) / 2;
    let y3 = y1;

    let x4 = x3;
    let y4 = 150 * (num_lvls - child.lvl) + 5;

    g.append("line")
    .attr("x1", x1)
    .attr("y1", y1)
    .attr("x2", x2)
    .attr("y2", y2)
    .attr("stroke", "black")

    g.append("line")
    .attr("x1", x3)
    .attr("y1", y3)
    .attr("x2", x4)
    .attr("y2", y4)
    .attr("stroke", "black")
}


function createName(svg, x=0, y=0, name) {
    svg.append("text")
    .attr("x", x)
    .attr("y", y)
    .attr("dy", ".2em")
    .text(name);
}


function printOnMouseover(text) {
    console.log(text);
}


// Creates a shiled in the given svg
// y - coord of upper bound of the shield
// x - coord of the center of the shield
function createShield(svg, x=0, y=0, person) {
    var areaGenerator = d3.area();
    areaGenerator.y0(y-50);
    
    var xOffset = 40;
    var yOffset = 40;

    var points = [
    [x - xOffset, y],
    [x - xOffset, y + yOffset],
    [x, y + 1.5 * yOffset],
    [x + xOffset, y + yOffset],
    [x + xOffset, y],
    ];
    var stroke_colour = person.male ? "blue" : "red";

    svg.append('path')
    .attr('d', areaGenerator(points))
    .attr('fill', 'white')
    .attr('stroke', stroke_colour)
    .attr('stroke-width', 5)
    .on('click', function () {
        console.log(person.bio);
      } );
}


function init(svgg) {
    console.log("Init run")
    // create svg element:
    svg = svgg;

    foo();
}
