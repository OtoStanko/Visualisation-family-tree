

//D3.js canvases
var textArea;
var mapArea;
var mapAreaWidth = 1520;

var svg;
var g;

var textSvg;
var textG;


var num_people;
var num_in_top_lvl;
var num_lvls;


// From the name of the person creates url for fetching the data from english wiki
const urlBuilder = (name) => {
    const fixedName = name.replaceAll(" ", "_")
    //console.log(fixedName)
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


// returns string with some basic info about the person
const getBio = (string) => {
    var regex = / \(.*[0-9]*.* – .*\) /g;
    var bioText = ""
    result = string.match(regex);
    if (result != null) {
        var rawResult = result[0].substring(2, result[0].length-2);
        if (rawResult.includes(";")) {
            rawResult = rawResult.substring(rawResult.indexOf(";") + 1);
        }
        bioText += rawResult;
    }

    // get death date
    // | death_date   = {{death date and age|2022|09|08|1926|04|21|df=yes}}
    /*regex = /death_date \s*= .*}}/g;
    result = string.match(regex);
    if(result != null) {
        result = result[0];
        console.log("DEATH1: " + result);
        result = result.substring(result.indexOf("{") + 2, result.indexOf("}"));
        result = result.split("|");
        let dates = [];
        for (i = 0; i < result.length; i++) {
            if (isNaN(result[i])) {
                continue;
            }
            dates.push(result[i]);
        }
        console.log("DEATH2: " + dates);
        if (dates.length != 6) {
            return;
        }
        var months = [ "January", "February", "March", "April", "May", "June", 
           "July", "August", "September", "October", "November", "December" ];
        bioText += "\n" + Number(dates[5]) + " " + months[Number(dates[4]) - 1] + " " + dates[3];
        bioText += " - " + Number(dates[2]) + " " + months[Number(dates[1]) - 1] + " " + dates[0];
    }*/

    // get full name
    regex = /birth_name\s*= .*\n/g;
    result = string.match(regex);
    if (result != null) {
        var rawResult = "\n" + result[0].substring(result[0].indexOf("=") + 2, result[0].length);
        bioText += rawResult;
    }
    console.log("bio: " + bioText);
    return bioText;
}


// From the content of the page extracts names of mother and father
const parseData = (string) => {
    //console.log(string);
    const regex = /father \s*= \[\[.*\]\]/g;
    var father = string.match(regex);
    if(father != null) {
        father = father[0].substring(father[0].indexOf("[") + 2, father[0].indexOf("]"))
        //console.log(father)
    }
    var mother = string.match(/mother \s*= \[\[.*\]\]/g);
    if(mother != null) {
        mother = mother[0].substring(mother[0].indexOf("[") + 2, mother[0].indexOf("]"))
        //console.log(mother)
    }
    //console.log(father, mother)
    return [mother, father]
}


async function expand(human) {
    human.expanded = true;
    if(human.mother.name != null) {
        human.mother.visible = true;
        await setInfo(human.mother)
    }
    if(human.father.name != null) {
        human.father.visible = true;
        await setInfo(human.father)
    }
}

async function setInfo(human) {
    const url = urlBuilder(human.name);
    const res = await fetch(url).then((res) => res.json())
    if (res["query"]["pages"][0]["missing"]) return;

    var text = res["query"]["pages"][0]["revisions"][0]["content"]

    console.log(text);
    var bio = getBio(text);
    human.bio = bio;

    const [mother, father] = parseData(text);
    var m_lvl = human.lvl + 1;
    var m_in_lvl = human.in_lvl * 2;
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
        visible: false,
        expanded: false,
    })
    var f_lvl = human.lvl + 1;
    var f_in_lvl = human.in_lvl * 2 + 1;
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
        visible: false,
        expanded: false,
    })
    human.mother = people[people.length - 2];
    human.father = people[people.length - 1];
    svg.selectAll("path"). remove();
    svg.selectAll("line"). remove();
    svg.selectAll("text"). remove();
    createGraph(people);
    console.log(people);
}


function getBaseLog(x, y) {
    return Math.log(y) / Math.log(x);
}

function countVisible(people) {
    let visibleCount = 0;
    for (i = 0; i < people.length; i++) {
        if (people[i].visible) {
            visibleCount++;
        }
    }
    return visibleCount;
}


function isTop(people, numlvl) {
    var array = [];
    for (i = 0; i < people.length; i++) {
        if (people[i].lvl == numlvl && people[i].visible) {
            array.push(people[i].in_lvl)
        }
    }
    if (array.length <= 2) {
        return false;
    }
    array.sort();
    var cons = 1;
    for (i = 0; i < array.length - 1; i++) {
        if (array[i] + 1 == array[i+1]) {
            cons += 1;
        }
        if (cons >= 3) {
            return true;
        }
    }
    return false;
}



function getXPos(person, num_lvls, num_in_top_lvl) {
    var x_pos = 0;
    if (person.lvl <= num_lvls) {
        //console.log(person.name + " is ok. In lvl:  " + person.lvl + " " + person.in_lvl);
        x_pos = (person.in_lvl + 0.5) * ((120 * num_in_top_lvl) / (Math.pow(2, person.lvl)));
    } else {
        //console.log(person.name + " is nok. In lvl:  " + person.lvl + " " + person.in_lvl);
        var currlvl = person.lvl;
        var inlvl = person.in_lvl;
        let genderOffset = 0;
        while (currlvl != num_lvls) {
            //console.log(genderOffset);
            genderOffset += ((inlvl % 2 == 0) ? -0.5 : 0.5);
            inlvl = Math.floor(inlvl / 2);
            currlvl--;
        }
        //console.log(num_lvls + " " + inlvl + " " + genderOffset);
        x_pos = (inlvl + 0.5 + genderOffset) * ((120 * num_in_top_lvl) / (Math.pow(2, num_lvls)));
    }
    return x_pos;
}


function createGraph(people) {
    num_people = people.length;
    var maxPeopleLvl = 0;
    for (i =0; i < num_people; i++) {
        if (people[i].lvl > maxPeopleLvl && people[i].visible) {
            maxPeopleLvl = people[i].lvl;
        }
    }
    //console.log("max level in the tree: " + maxPeopleLvl);

    num_in_top_lvl = 2;
    num_lvls = 1;
    for (level = maxPeopleLvl; level >= 1; level--) {
        if (isTop(people, level)) {
            console.log("Top level:" + level);
            num_in_top_lvl = Math.pow(2, level);
            num_lvls = level;
            break;
        }
    }
    //console.log(num_in_top_lvl, num_lvls);

    for (i = 0; i < num_people; i++) {
        if (people[i].name != null && people[i].visible) {
            //console.log("name: " + people[i].name);
            var xNameOffset = people[i].name.length * 3;
            var x_pos = getXPos(people[i], num_lvls, num_in_top_lvl);
            
            createLines(g, people[i], people[i].mother, people[i].father, x_pos);
            createShield(g, x_pos, 150 * (num_lvls - people[i].lvl), people[i]);
            createName(g, x_pos - xNameOffset, 150 * (num_lvls - people[i].lvl) - 5, people[i].name)
        }
    }
}


// Main function for getting the data about the housetree
// Starts with Her Majesty Qeeen Elizabeth II
async function foo(depth=2) {
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
        visible: true,
        expanded: false,
    })
    setInfo(people[0]);
    console.log(people)
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
    expanded: false,
}
var people = []
var visited = []


function createPartialLines(g, person, predecessor, x_pos) {
    if(predecessor.name != null && predecessor.visible) {
        let x1 = getXPos(predecessor, num_lvls, num_in_top_lvl);
        let y1 = 150 * (num_lvls - predecessor.lvl) + 5;
        let x2 = x_pos;
        let y2 = y1;
        g.append("line")
        .attr("x1", x1)
        .attr("y1", y1)
        .attr("x2", x2)
        .attr("y2", y2)
        .attr("stroke", "black")

        let x3 = x_pos;
        let y3 = y1;
        let x4 = x_pos;
        let y4 = 150 * (num_lvls - person.lvl) + 5;
        g.append("line")
        .attr("x1", x3)
        .attr("y1", y3)
        .attr("x2", x4)
        .attr("y2", y4)
        .attr("stroke", "black")
    }
}

function createLines(g, person, mother, father, x_pos) {
    createPartialLines(g, person, person.mother, x_pos);
    createPartialLines(g, person, person.father, x_pos);
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
        if(!person.expanded) {
            expand(person);
        }
        let xOffset = 22;
        textSvg.selectAll("text").remove();
        textSvg.append("text")
        .attr("x", xOffset)
        .attr("y", 10)
        .attr("dy", ".2em")
        .text(person.name);
        if (person.bio != "") {
            let parsedBio = person.bio.split("\n");
            for (i = 0; i < parsedBio.length; i++) {
                textSvg.append("text")
                .attr("x", xOffset)
                .attr("y", 30 + i*20)
                .attr("dy", ".2em")
                .text(parsedBio[i]);
            }
        }
      });
}


function init(svg_fromHTML, text_svg) {
    console.log("Init run")
    // create svg element:
    svg = svg_fromHTML;

    textSvg = text_svg;
    var areaGenerator = d3.area();
    console.log(document.body.offsetWidth, document.documentElement.clientHeight);
    var points = [
        [1, 0],
        [1, document.documentElement.clientHeight],
        [15, document.documentElement.clientHeight],
        [15, 0],
        ];
    let stroke_colour = "yellow";
    textSvg.append('path')
    .attr('d', areaGenerator(points))
    .attr('fill', 'red')
    .attr('stroke', stroke_colour)
    .attr('stroke-width', 3)

    foo();
}
