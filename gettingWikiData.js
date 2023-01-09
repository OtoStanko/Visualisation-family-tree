

//D3.js canvases
var svg = d3
    .select(".main")
    .append("svg")
    .attr("width", document.documentElement.clientWidth * 0.75)
    .attr("height", document.documentElement.clientHeight * 0.60);
var g = svg.append("g");
var zoom = d3.zoom()
zoom.on('zoom', event => {
    g.attr("transform", event.transform)
})



var textSvg = d3
    .select(".sidebar")
    .append("svg")
    .attr("width", document.body.offsetWidth * 0.25)
    .attr("dx", document.body.offsetWidth * 0.75)
    .attr("height", document.documentElement.clientHeight * 0.60);
var textG = textSvg.append("g");

var barSvg = d3
    .select(".barplot")
    .append("svg")
    .attr("width", document.body.offsetWidth)
    .attr("dy", document.body.offsetHeight * 0.75)
    .attr("height", document.documentElement.clientHeight * 0.25);

var num_people;
var num_in_top_lvl;
var num_lvls;

var prev_selected = null;
var prev_selected_name = "";
var prev_selected_male = true;

var prev_bar = null;
var prev_bar_name = null;
var prev_bar_male = true;


// From the name of the person creates url for fetching the data from english wiki
const urlBuilder = (name) => {
    console.log(name);
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


/*
====================
IMAGES
====================
 */

async function parseImage(text) {
    try {
        let regex = /image \s*=.*\n/g;
        let result = text.match(regex);
        if (result == null) {
            return "";
        }
        result = result[0];
        result = result.substring(result.indexOf('=')+1).trim()
        result = result.replaceAll('\n', '');
        
        const comment = result.indexOf("<");
        if (comment != -1) {
            result = result.substring(0, comment);
        }
        result = result.replaceAll(' ', '_');

        let imgUrl = "https://en.wikipedia.org/w/api.php";
        imgUrl += "?origin=*&action=query&format=json&titles=";
        if (!result.startsWith("File:")) {
            imgUrl += "File:"
        }
        imgUrl += result;
        imgUrl += "&prop=imageinfo&iiprop=url";

        const data = await fetch(imgUrl).then(res => res.json()).catch(err => console.error(err));
        console.log(data);

        try {
            const d = data["query"]["pages"][-1]["imageinfo"][0]["url"];
            return d;
        } catch(Ex) {
            const pages = data["query"]["pages"];
            for (let page in pages) {
                console.log(page);
                return pages[page]["imageinfo"][0]["url"];
            }
        }
    } catch(Ex) {
        return "";
    }


    // https://en.wikipedia.org/w/api.php?origin=*&action=query&format=json&titles=Queen_Elizabeth_II_official_portrait_for_1959_tour_(retouched)_(cropped)_(3-to-4_aspect_ratio).jpg&prop=imageinfo&iiprop=url 
} 

async function getImageUrl(person) {
    var url = "https://en.wikipedia.org/w/api.php"; 

    var params = {
        action: "query",
        prop: "images",
        titles: person.name,
        format: "json"
    };

    url = url + "?origin=*";
    Object.keys(params).forEach(function(key){url += "&" + key + "=" + params[key];});

    await fetch(url)
        .then(function(response){return response.json();})
        .then(function(response) {
            var pages = response.query.pages;
            console.log(pages);
            for (var page in pages) {
                for (var img of pages[page].images) {
                    let imgUrl = "https://en.wikipedia.org/w/api.php";
                    imgUrl += "?origin=*&action=query&format=json&titles=";
                    imgUrl += img.title;
                    imgUrl += "&prop=imageinfo&iiprop=url";
                    console.log(imgUrl);
                    fetch(imgUrl).then((res) => res.json())
                    .then(
                        function(res) {
                            if (res["query"]["pages"][-1]["missing"]) return;
                            let resultUrl = res["query"]["pages"][-1]["imageinfo"][0]["url"];
                            console.log("RESULT URL " + resultUrl);
                            return resultUrl;
                        }
                    )
                    //console.log(img.title);
                }
            }
        })
        .catch(function(error){console.log(error);});
}




/*
====================
Parsing the fetched data
====================
 */

// returns string with some basic info about the person
const getBio = (string) => {
    var regex = / \(.*[0-9]*.* – .*\) /g;
    var bioText = ""
    /*result = string.match(regex);
    if (result != null) {
        var rawResult = result[0].substring(2, result[0].length-2);
        if (rawResult.includes(";")) {
            rawResult = rawResult.substring(rawResult.indexOf(";") + 1);
        }
        console.log("BIO start");
        console.log(rawResult);
        bioText += rawResult;
    }*/

    // get death date, also includes birth date
    // | death_date   = {{death date and age|2022|09|08|1926|04|21|df=yes}}
    regex = /death_date \s*= .*}}/g;
    result = string.match(regex);
    if(result != null) {
        result = result[0];
        //console.log("DEATH1: " + result);
        result = result.substring(result.indexOf("{") + 2, result.indexOf("}"));
        result = result.split("|");
        let dates = [];
        for (i = 0; i < result.length; i++) {
            if (isNaN(result[i])) {
                continue;
            }
            dates.push(result[i]);
        }
        //console.log("DEATH2: " + dates);
        if (dates.length != 6) {
            return;
        }
        var months = [ "January", "February", "March", "April", "May", "June", 
           "July", "August", "September", "October", "November", "December" ];
        bioText += "\n" + Number(dates[5]) + " " + months[Number(dates[4]) - 1] + " " + dates[3];
        bioText += " - " + Number(dates[2]) + " " + months[Number(dates[1]) - 1] + " " + dates[0];
    }

    // get full name
    regex = /birth_name\s*= .*\n/g;
    result = string.match(regex);
    if (result != null) {
        var rawResult = "\n" + result[0].substring(result[0].indexOf("=") + 2, result[0].length);
        bioText += rawResult;
    }
    //console.log("bio: " + bioText);
    return bioText;
}


// From the content of the page extracts names of mother and father
const getParentsNames = (string) => {
    //console.log(string);
    regex = /father \s*= \[\[.*\]\]/g;
    var father = string.match(regex);
    if(father != null) {
        father = father[0].substring(father[0].indexOf("[") + 2, father[0].indexOf("]"));
        //console.log(father)
    } else {
        father = null;
    }
    var mother = string.match(/mother \s*= \[\[.*\]\]/g);
    if(mother != null) {
        mother = mother[0].substring(mother[0].indexOf("[") + 2, mother[0].indexOf("]"));
        //console.log(mother)
    } else {
        mother = null;
    }
    //console.log(father, mother)
    return [mother, father]
}

const getSpouseName = (string) => {
    const regex = /spouse \s*= .*\[\[.*\]\]/g;
    var spouse = string.match(regex);
    //console.log("RES:");
    //console.log(spouse);
    if(spouse != null) {
        var spouseName = spouse[0].substring(spouse[0].indexOf("[") + 2, spouse[0].indexOf("]"));
        //console.log(father)
    }
    return spouseName;
    /*
    | spouse       = {{Marriage|[[Prince Philip, Duke of Edinburgh]]|20 November 1947|9 April 2021|reason=d}}
     */
}


function extractNames(text) {
    regex = /\[\[.*?\]\]/g;
    var childrenNames = text.match(regex);
    console.log(childrenNames);
    var chilrenArray = [];
    for (var index in childrenNames) {
        let child = childrenNames[index];
        chilrenArray.push(child.substring(2, child.length-2));
    }
    return chilrenArray;
}

const getChildrenNames = (string) => {
    // issue
    //const regex = /issue \s*= {{.*}}/g;
    var regex = /issue \s*= {{.*?}}/s;
    var childrenList = string.match(regex);
    if (childrenList != null) {
        console.log("FIRST MATCH");
        console.log(childrenList[0]);
        if (!childrenList[0].includes("{{Plainlist}}")) {
            return extractNames(childrenList[0]);
        } else {
            console.log("LONG PLAINLIST");
            console.log(childrenList[0]);
            regex = /issue \s*= {{Plainlist}}.*?{{Endplainlist}}/s;
            childrenList = string.match(regex);
            return extractNames(childrenList[0]);
        }
        
    }

    regex = /children \s*= {{.*?}}/s;
    childrenList = string.match(regex);
    if (childrenList != null) {
        childrenList = childrenList[0];
        regex = /\n/g;
        childrenList = childrenList.match(regex);
        if (childrenList == null) {
            return [];
        }
        return childrenList;
    }
    return [];
    //console.log("CHILDREN:");
    //console.log(childrenList);
    
    


    // children
}





/*
====================
Interaction with the person
====================
 */

async function expand(person) {
    person.expanded = true;
    if(person.mother != null) {
        console.log("MOTHER")
        console.log(person);
        console.log(person.mother);
        await setInfo(person.mother)
        person.mother.visible = true;
        
    }
    if(person.father != null) {
        console.log("FATHER")
        console.log(person);
        console.log(person.father);
        await setInfo(person.father)
        person.father.visible = true;
    }
    svg.selectAll("path"). remove();
    svg.selectAll("line"). remove();
    svg.selectAll("text"). remove();
    svg.selectAll("defs"). remove();
    createGraph(people);
    createBar(people);

    createName(g,
        getXPos(person,
        num_lvls, num_in_top_lvl) - (person.name.length * 3),
        150 * (num_lvls - person.lvl) - 70,
        person.name,
        (person.male) ? "blue" : "red");
    if(prev_selected != null) {
        prev_selected.setAttribute('style', 'stroke: yellow');
    }
}

async function setInfo(person) {
    console.log("PRE-URL");
    console.log(person);
    const url = urlBuilder(person.name);
    const res = await fetch(url).then((res) => res.json())
    if (res["query"]["pages"][0]["missing"]) return;

    // fetched result
    var text = res["query"]["pages"][0]["revisions"][0]["content"]

    //console.log("===================================================");
    console.log(text);
    var bio = getBio(text);
    person.bio = bio;
    if (person.url == "") {
        person.url = await parseImage(text);
        if (person.url == null) {
            console.log(person);
        }
    }

    person.num_children = getChildrenNames(text).length;
    if (person.num_children == 0) {
        let regex = /children \s*=.*/g;
        let result = text.match(regex);
        console.log(result);
        if (result == null) {
            // still cannot get the number of children
            person.num_children = 1;
        } else {
            result = result[0];
            console.log(result.substring(result.indexOf("=") + 1));
            person.num_children = Number(result.substring(result.indexOf("=") + 1));
        }
        if (person.num_children == 0) {
            person.num_children = 1;
        }
    }

    // spouse
    /*var childrenMother = null;
    var childrenFather = null;
    var spouseName = getSpouseName(text);
    if(!isPersonInArray(people, spouseName)) {
        let spouse_lvl = person.lvl;
        var spouse_in_lvl = 0;
        var is_male = false;
        if (person.male) {
            spouse_in_lvl = person.in_lvl;
            is_male = false;
            // opravit vsetko napravo
        } else {
            spouse_in_lvl = person.in_lvl + 1;
            is_male = true;
            // opravit vsetko napravo
        }
        people.push({
            name: spouseName,
            url: "",
            img: "",
            father: [],
            mother: {},
            lvl: spouse_lvl,
            in_lvl: spouse_in_lvl,
            male: is_male,
            bio: "",
            visible: false,
            expanded: false,
        });
        if (person.male) {
            childrenFather = person;
            childrenMother = people[people.length - 1];
        } else {
            childrenMother = person;
            childrenFather = people[people.length - 1];
        }
    }*/


    // down
    /*let children = getChildrenNames(text);
    if (person.lvl == 0) {
        incrementLVLs(people);
    }

    let children_lvl = person.lvl - 1;
    let offset = children.length;
    let leftmostChild_in_lvl = childrenMother.in_lvl / 2;

    repairUp(people, children_lvl, offset, leftmostChild_in_lvl);
    repairDown(people, children_lvl, offset);


    if (children != [] && children.length != 0) {
        for(i = 0; i < children.length; i++) {
            let childName = children[i];
            people.push({
                name: childName,
                url: "",
                img: "",
                father: childrenFather,
                mother: childrenMother,
                lvl: children_lvl,
                in_lvl: leftmostChild_in_lvl + i,
                male: false,
                bio: "",
                visible: false,
                expanded: false,
            });
        }
    }*/


    // up
    console.log("UP FOR: " + person.name);
    const [mother, father] = getParentsNames(text);

    console.log("HERE");
    console.log(person);
    console.log(mother);
    console.log(father);


    person.mother = null;
    person.father = null;
    if (mother != null) {
        var m_lvl = person.lvl + 1;
        var m_in_lvl = person.in_lvl * 2;
        let side = (person.side != "white") ? person.side : "lightcoral";
        people.push({
            name: mother,
            url: "",
            img: "",
            father: null,
            mother: null,
            lvl: m_lvl,
            in_lvl: m_in_lvl,
            male: false,
            bio: "",
            visible: false,
            expanded: false,
            num_children: 0,
            shield: null,
            bar: null,
            side: side,
        });
        person.mother = people[people.length - 1];
    }
    if (father != null) {
        var f_lvl = person.lvl + 1;
        var f_in_lvl = person.in_lvl * 2 + 1;
        let side = (person.side != "white") ? person.side : "lightblue";
        people.push({
            name: father,
            url: "",
            img: "",
            father: null,
            mother: null,
            lvl: f_lvl,
            in_lvl: f_in_lvl,
            male: true,
            bio: "",
            visible: false,
            expanded: false,
            num_children: 0,
            shield: null,
            bar: null,
            side: side,
        });
        person.father = people[people.length - 1];
    }
    
    /*svg.selectAll("path"). remove();
    svg.selectAll("line"). remove();
    svg.selectAll("text"). remove();
    svg.selectAll("defs"). remove();
    createGraph(people);
    createBar(people);*/
    //console.log(people);
}


function createBar(people) {
    barSvg.selectAll("rect").remove();
    barSvg.selectAll("text").remove();
    let visible_people = getVisible(people);
    let max_children = 0;
    let barWidth = document.body.offsetWidth / visible_people.length;
    let thisCanvasHeight = document.documentElement.clientHeight * 0.25;
    for (i = 0; i < people.length; i++) {
        if (people[i].num_children > max_children) {
            max_children = people[i].num_children;
        }
    }
    max_children++;
    for (let index = 0; index < visible_people.length; index++) {
        let person = visible_people[index];
        //console.log(person.name + " " + person.num_children + " " + index);

        //compute bar height with respect to the represented value and availible space
        var barHeight = ((person.num_children + 1) / max_children) * (document.documentElement.clientHeight * 0.24);
    
        //append a bar to the barchart
        let reselect = false;
        let stroke_colour = (person.male) ? "blue" : "red";
        if (person.name == prev_bar_name) {
            stroke_colour = "yellow";
            reselect = true;
        }
        let curr_bar = barSvg.append("rect")
            .attr("x", 0 + index * barWidth)
            .attr("y", thisCanvasHeight - barHeight)
            .attr("width", barWidth)
            .attr("height", barHeight)
            .attr("fill", person.side)
            .attr("stroke", stroke_colour)
            .attr("stroke-width", 2)
            .on('click', function () {
                // change the colour of the previously selected person back to its original colour
                if (prev_selected != null) {
                    if (prev_selected_male) {
                        prev_selected.setAttribute('style', 'stroke: blue');
                    } else {
                        prev_selected.setAttribute('style', 'stroke: red');
                    }
                }
                // same with the bar
                if (prev_bar != null) {
                    //console.log(prev_bar);
                    if (prev_bar_male) {
                        prev_bar.setAttribute('style', 'stroke: blue');
                    } else {
                        prev_bar.setAttribute('style', 'stroke: red');
                    }
                }

                // set the currently selected person to previous and change the stroke to yellow
                if (prev_selected != null) {
                    //console.log(person.shield);
                    prev_selected = person.shield;
                    prev_selected_male = person.male;
                    prev_selected_name = person.name;
                    person.shield.setAttribute('style', 'stroke: yellow');
                }
                // same with the bar
                prev_bar = person.bar;
                prev_bar_male = person.male;
                prev_bar_name = person.name;
                prev_bar.setAttribute('style', 'stroke: yellow');
        
                // setup the left panel with the text
                let xOffset = 22;
                let yOffset = 0;
                textSvg.selectAll("text").remove();
                yOffset = printText(person.name, xOffset, yOffset, 10);
                
                if (person.bio != "") {
                    let parsedBio = person.bio.split("\n");
                    for (i = 0; i < parsedBio.length; i++) {
                        yOffset = printText(parsedBio[i], xOffset, yOffset, 30 + 20*i)
                    }
                }
        
                // remove the displayed name and display the name of the selected person
                svg.selectAll("text"). remove();
                createName(g,
                    getXPos(person,
                    num_lvls, num_in_top_lvl) - (person.name.length * 3),
                    150 * (num_lvls - person.lvl) - 70,
                    person.name,
                    (person.male) ? "blue" : "red");
            });
        barSvg.append("text")
        .attr("x", 0 + (index + 0.5) * barWidth)
        .attr("y", thisCanvasHeight - barHeight + 20)
        .text(person.num_children)


        person.bar = curr_bar["_groups"]["0"][0];
        if (reselect) {
            prev_bar = person.bar;
        }
    }
}




/*
====================
UTILS
====================
 */

function getVisible(people) {
    let visible_people = [];
    for (i = 0; i < people.length; i++) {
        if (people[i].visible) {
            visible_people.push(people[i]);
        }
    }
    return visible_people;
}

// returns the new yoffset
function printText(text, xOffset, yOffset, y) {
    if (text.length >= 40) {
        let index = 40;
        while (text[index] != " ") {
            index--;
        }
        textSvg.append("text")
        .attr("x", xOffset)
        .attr("y", y + yOffset)
        .attr("dy", ".2em")
        .text(text.substring(0, index));
        yOffset += 20;
        textSvg.append("text")
        .attr("x", xOffset)
        .attr("y", y + yOffset)
        .attr("dy", ".2em")
        .text(text.substring(index));
    } else {
        textSvg.append("text")
        .attr("x", xOffset)
        .attr("y", y + yOffset)
        .attr("dy", ".2em")
        .text(text);
    }
    return yOffset;
}

function repairUp(people, start_lvl, offset, leftmost_in_lvl) {
    // get max lvl
    var max_lvl = people[0].lvl;
    for (i = 0; i < people.length; i++) {
        if (people[i].lvl > max_lvl) {
            max_lvl = people[i].lvl;
        }
    }
    // repair the starting lvl
    for (i = 0; i < people.length; i++) {
        if (people[i].lvl == start_lvl && people[i].in_lvl >= leftmost_in_lvl) {
            people.in_lvl += offset;
        }
    }
    // for upper levels:
    // for female, get the smaller in_lvl of her children
    // for male, get the largest in_lvl of his children
    for (curr_lvl = start_lvl + 1; start_lvl <= max_lvl; curr_lvl++) {
        for (i = 0; i < people.length; i++) {
            let person = people[i];
            if (person.lvl == curr_lvl) {
                if (!person.male) {
                    person.in_lvl = getSmallestChildInLvl(people, person) * 2;
                } else {
                    person.in_lvl = getTheLargestChildInLvl(people, person) * 2 + 1;
                }
            }
        }
    }
}

function getTheLargestChildInLvl(people, person) {
    let largest_in_lvl = null;
    for (i = 0; i < people.length; i++) {
        if (people[i].father == person) {
            if (largest_in_lvl == null) {
                largest_in_lvl = people[i].in_lvl;
            }
            if (people[i].in_lvl > largest_in_lvl) {
                largest_in_lvl = people[i].in_lvl;
            }
        }
    }
    return largest_in_lvl;
}

function getSmallestChildInLvl(people, person) {
    let smallest_in_lvl = null;
    for (i = 0; i < people.length; i++) {
        if (people[i].mother == person) {
            if (smallest_in_lvl == null) {
                smallest_in_lvl = people[i].in_lvl;
            }
            if (people[i].in_lvl < smallest_in_lvl) {
                smallest_in_lvl = people[i].in_lvl;
            }
        }
    }
    return smallest_in_lvl;
}

function getPerson(people, name) {
    for (i = 0; i < people.length; i++) {
        if (people[i].name == name) {
            return people[i];
        }
    }
}

function isPersonInArray(people, name) {
    for (i = 0; i < people.length; i++) {
        if (people[i].name == name) {
            return true;
        }
    }
    return false;
}

function incrementLVLs(people) {
    for(i = 0; i < people.length; i++) {
        people[i].lvl += 1;
    }
}

function getBaseLog(x, y) {
    return Math.log(y) / Math.log(x);
}

// returns the number of visible people in the people array
function countVisible(people) {
    let visibleCount = 0;
    for (i = 0; i < people.length; i++) {
        if (people[i].visible) {
            visibleCount++;
        }
    }
    return visibleCount;
}


// returns true if in the level are at least 3 people right next to each other
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


/*
====================
TIGHT LAYOUT ALGORITHM
====================
 */

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
            // console.log("Top level:" + level);
            num_in_top_lvl = Math.pow(2, level);
            num_lvls = level;
            break;
        }
    }
    //console.log(num_in_top_lvl, num_lvls);

    for (i = 0; i < num_people; i++) {
        if (people[i].name != null && people[i].visible) {
            //console.log("name: " + people[i].name);
            var x_pos = getXPos(people[i], num_lvls, num_in_top_lvl);
            
            createLines(g, people[i], people[i].mother, people[i].father, x_pos);
            createShield(g, x_pos, 150 * (num_lvls - people[i].lvl), people[i]);
            //createName(g, x_pos - xNameOffset, 150 * (num_lvls - people[i].lvl) - 5, people[i].name)
        }
    }
}


// Main function for getting the data about the housetree
// Starts with Her Majesty Qeeen Elizabeth II
async function foo() {
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
        num_children: 0,
        shield: null,
        bar: null,
        side: "white",
    })
    await setInfo(people[0]);

    svg.selectAll("path"). remove();
    svg.selectAll("line"). remove();
    svg.selectAll("text"). remove();
    svg.selectAll("defs"). remove();
    createGraph(people);
    createBar(people);
    //console.log(people)
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

function createPartialLines(g, person, predecessor, x_pos) {
    if(predecessor != null && predecessor.name != null && predecessor.visible) {
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


function createName(svg, x=0, y=0, name, colour) {
    svg.append("text")
    .attr("x", x)
    .attr("y", y)
    .attr("dy", ".2em")
    .attr("fill", colour)
    .text(name);
}


function svgBackgroundImage(url, w, pattern_id) {
  
    const bg = d3.create("svg"),
          defs = bg.append("defs");
    
    defs.append("pattern")
      .attr("id", pattern_id ? pattern_id : "pattern")
      .attr("width", 1)
      .attr("height", 1)
      .append('image')
        .attr("xlink:href", url)
        .attr("x", -0.05 * w)
        .attr("y", - 0.05 * w)
        .attr("width", 1.1 * w)
        .attr("height", 1.1 * w);
    
    return bg.node();
}


// Creates a shield in the given svg
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
    // when redrawing the whole graph, the new shield needs to be reassigned to the previous_selected_...
    // this is a check that it needs to be done once the shield is created
    var reselect = false;
    if (prev_selected_name == person.name) {
        stroke_colour = "yellow";
        reselect = true;
    }

    const hash = (person) => {
        const str = person.name.replaceAll(' ', '_');
        let h = 0;
        let rand = Math.floor(Math.random() * Math.random()*100000000); 
        if (str.length == 0) return h;
        for (let char in str) {
            h = ((h << rand)-h)+ char;
            h = h & h;
        }
        return h;
    }
    const hashedName = hash(person);

    // create background image
    svg
    .append("defs").append("pattern")
    .attr('id', `img-${hashedName}`)
    .attr('height', '120')
    .attr('width', '100')
    .attr( 'x', x-50) 
    .attr('y', y-50)
    .attr('patternUnits', 'userSpaceOnUse')
    
    .append('image')
    .attr('href', `${person.url}`)
    .attr( 'x', "0") 
    .attr('y', "0")
    .attr('width', "100")
    .attr('height', "120")

    let filling = `url(#img-${hashedName})`;

    if (person.url == "") {
        filling = "white";
    }

    // shield in the form of the svg path
    let current = svg
    .append('path')
    .attr('d', areaGenerator(points))
    .attr('fill', filling)
    .attr('stroke', stroke_colour)
    .attr('stroke-width', 5)
    .on('click', function () {
        if(!person.expanded) {
            expand(person);
        }

        // change the colour of the previously selected person back to its original colour
        if (prev_selected != null) {
            if (prev_selected_male) {
                prev_selected.setAttribute('style', 'stroke: blue');
            } else {
                prev_selected.setAttribute('style', 'stroke: red');
            }
        }
        // same with the bar
        if (prev_bar != null) {
            //console.log(prev_bar);
            if (prev_bar_male) {
                prev_bar.setAttribute('style', 'stroke: blue');
            } else {
                prev_bar.setAttribute('style', 'stroke: red');
            }
        }

        // set the currently selected person to previous and change the stroke to yellow
        prev_selected = this;
        prev_selected_male = person.male;
        prev_selected_name = person.name;
        this.setAttribute('style', 'stroke: yellow');
        // same with the bar
        prev_bar = person.bar;
        prev_bar_male = person.male;
        prev_bar_name = person.name;
        prev_bar.setAttribute('style', 'stroke: yellow');

        // setup the left panel with the text
        let xOffset = 22;
        let yOffset = 0;
        textSvg.selectAll("text").remove();
        yOffset = printText(person.name, xOffset, yOffset, 10);
        
        if (person.bio != "") {
            let parsedBio = person.bio.split("\n");
            for (i = 0; i < parsedBio.length; i++) {
                yOffset = printText(parsedBio[i], xOffset, yOffset, 30 + 20*i)
            }
        }

        // remove the displayed name and display the name of the selected person
        svg.selectAll("text"). remove();
        createName(g,
            getXPos(person,
            num_lvls, num_in_top_lvl) - (person.name.length * 3),
            150 * (num_lvls - person.lvl) - 70,
            person.name,
            (person.male) ? "blue" : "red");
        

            /*
            // Some calculations
            let xOffset_translation = document.body.clientWidth/2;
            let yOffset_translation = document.body.clientHeight/2


            console.log(d3.zoomTransform(svg.node()));
            console.log(d3.zoomTransform(g.node()));

        var t = d3.zoomIdentity.translate(xOffset_translation, yOffset_translation).scale(4);
        svg.transition()
        .duration(750)
        .call(
            zoom.transform, 
            d3.zoomIdentity.translate(xOffset_translation, yOffset_translation).scale(4)
        );
        
        let selected_y = getXPos(person, num_lvls, num_in_top_lvl);
        let selected_x = 150 * (num_lvls - person.lvl);
        console.log(selected_x, selected_y);
        
        
        let tr = `translate(${-selected_x + xOffset_translation},${-selected_y + yOffset_translation})`;
        console.log(zoom);
        zoom.translateTo(svg, xOffset_translation, yOffset_translation);*/
        //g.transition().call(zoom.transform, d3.zoomIdentity);
        //svg.transition().call(zoom.transform, d3.zoomIdentity.translate(xOffset_translation, yOffset_translation))
        //.scale(1).translate(-selected_x, -selected_y);
        //zoom.zoomTransform(svg).invert([xOffset_translation, yOffset_translation]);
        //g.attr("transform", tr);
    });


    person.shield = current["_groups"]["0"][0];
    if(reselect) {
        prev_selected = current["_groups"]["0"][0];
        reselect = false;
    }
}


function init() {
    //console.log("Init run")
    // create svg element:
    console.log(zoom);
    var areaGenerator = d3.area();
    //console.log(document.body.offsetWidth, document.documentElement.clientHeight);
    var points = [
        [1, 0],
        [1, document.documentElement.clientHeight],
        [15, document.documentElement.clientHeight],
        [15, 0],
        ];
    let stroke_colour = "yellow";

    foo();
}


svg.call(zoom)
init();
