/* Variables */
let dataReference =[] // Database for all Pokemon
let PokemonBaseData = []; // basic data of Pokemons
let PokemonData = []; // Pokemon Data
let NameListPokemon = []; // List which Pokemon are in interest according filter and name search

/* functions to get API Data and save in Database */

async function getDataReference(){
    let url = 'https://pokeapi.co/api/v2/pokemon/?offset=0&limit=1281'; // all 1281
    let response = await loadDatafromAPI(url);
    saveDataReference(response);
}


function saveDataReference(APIResponseJSON){
    for (let i = 0; i < APIResponseJSON['results'].length; i++) {
        let name = APIResponseJSON['results'][i]['name'];
        let url = APIResponseJSON['results'][i]['url'];
        dataReference.push({PokemonName: name,PokemonURL: url})
    }
}


async function loadDatafromAPI(url){
    let response = await fetch(url);
    let responseJSON = await response.json();
    return responseJSON;
}


async function getPokemonBaseData (PokemonName){
    if (getIdxOfPokemonInDataBase(PokemonName,PokemonBaseData) == -1) {
        let url = `https://pokeapi.co/api/v2/pokemon/${PokemonName}`;
        let response = await loadDatafromAPI(url);
        url = `https://pokeapi.co/api/v2/pokemon-species/${PokemonName}`;
        let responseSpecies = await loadDatafromAPI(url);
        response['color'] = responseSpecies['color']['name'];
        response['name'] = responseSpecies['name']; // line needed because of DB inconsistency
        savePokemonBaseData(response);
    }
}


function savePokemonBaseData(APIResponseJSON){
    let name = APIResponseJSON['name'];
    let id = APIResponseJSON['id'];
    let color = APIResponseJSON['color'];
    let types = getTypes(APIResponseJSON);
    let img = getPokemonImg(APIResponseJSON);

    PokemonBaseData.push({PokemonName: name, PokemonID: id, Color: color, Types: types, Img: img})
}


async function getPokemonData(PokemonName){
    let url = `https://pokeapi.co/api/v2/pokemon/${PokemonName}`;
    let responsePokemon = await loadDatafromAPI(url);
    url = `https://pokeapi.co/api/v2/pokemon-species/${PokemonName}`;
    let responseSpecies = await loadDatafromAPI(url);
    url = responseSpecies['evolution_chain']['url'];
    let responseEvolution = await loadDatafromAPI(url);
    let dataEvolution = await formatEvolutionData(responseEvolution);
    if (!responseSpecies['habitat']) {
        responseSpecies['habitat']={name: 'unknown'};
    }
    savePokemonData(responsePokemon,responseSpecies,dataEvolution);
}


function savePokemonData(dataPokemon,dataSpecies,dataEvolution){
    PokemonData = [
        {
            Information: {
                            XP:dataPokemon['base_experience'],
                            Color: dataSpecies['color']['name'],
                            Height:dataPokemon['height'],
                            Weight:dataPokemon['weight'],
                            Type:getTypes(dataPokemon),
                            Habitat:dataSpecies['habitat']['name'],
                            Name: dataPokemon['name'],
                            ID: dataPokemon['id'],
                            img: getPokemonImg(dataPokemon)
                        },
            BaseStats: {
                            HP:dataPokemon['stats'][0]['base_stat'],
                            Attack:dataPokemon['stats'][1]['base_stat'],
                            Defence:dataPokemon['stats'][2]['base_stat'],
                            SpecialAttack:dataPokemon['stats'][3]['base_stat'],
                            SpecialDefence:dataPokemon['stats'][4]['base_stat'],
                            Speed:dataPokemon['stats'][5]['base_stat']
                        },
            AddInformation: {
                            Happines: dataSpecies['base_happiness'],
                            GrowthRate:dataSpecies['growth_rate']['name'],
                            Generation:dataSpecies['generation']['name'].split('-')[1],
                            Shape:dataSpecies['shape']['name'],
                            Abilities:getAbilities(dataPokemon),
                            },
            Evolution: dataEvolution,
        }
    ]
}


function getTypes(APIResponseJSON){
    let types = [];
    for (let i = 0; i < APIResponseJSON['types'].length; i++) {
        types.push(APIResponseJSON['types'][i]['type']['name']);
    }
    return types;
}


function getAbilities(APIResponseJSON){
    let abilities = [];
    for (let i = 0; i < APIResponseJSON['abilities'].length; i++) {
        abilities.push(APIResponseJSON['abilities'][i]['ability']['name']);
    }
    return abilities;
}


async function formatEvolutionData(dataEvolution){
    let evolutionData = [];
    let data = [];
    let keyNames = [];
    for (let i = 0; i < 10; i++){
            let PokemonName = eval(`dataEvolution['chain']${keyNames}['species']['name']`);
            let response = await loadDatafromAPI( `https://pokeapi.co/api/v2/pokemon/${PokemonName}`);
            data = {
                img: response['sprites']['other']['dream_world']['front_default'],
                name: PokemonName,
                evolutionStep:i,
                }
        if (eval(`dataEvolution['chain']${keyNames}['evolves_to'].length == 0`)) {
            evolutionData.push(data);
            break;
        } else{
            data['evolutionnTrigger'] = eval(`dataEvolution['chain']${keyNames}['evolves_to'][0]['evolution_details'][0]['trigger']['name']`);
            data['evolutionLvl'] = eval(`dataEvolution['chain']${keyNames}['evolves_to'][0]['evolution_details'][0]['min_level']`);
            evolutionData.push(data);
        }
        keyNames += `['evolves_to'][0]`;
    }
    return evolutionData;
}


async function prepareDataToRender(NameListAry){
    NameListPokemon = [];
    for (let i = 0; i < NameListAry.length; i++) {
        NameListPokemon.push({PokemonName:NameListAry[i]});
        NameListAry[i] = checkDBInconsistency(NameListAry[i]);
        await getPokemonBaseData (NameListAry[i]);
        renderLoadingScreen(i,NameListAry.length-1);
    }
}


/* functions to render HTML Content */

async function initHP(){
    await getDataReference();
    filterPokemon();
}


function renderPokedexCards(NameList){
    let content = document.getElementById('PokedexCards');
    content.innerHTML = '';
    for (let i = 0; i < NameList.length; i++) {
        let idx = getIdxOfPokemonInDataBase(NameList[i]['PokemonName'],PokemonBaseData);
        content.innerHTML += getCardHTML(idx);
        setCardBgImg(`Card${PokemonBaseData[idx]['PokemonID']}`,PokemonBaseData[idx]['Color']);
    }
}


function getCardHTML(DataBaseIdx){
    let PokeData = PokemonBaseData[DataBaseIdx];
    let HTMLtypes =[];
    for (let i = 0; i < PokeData['Types'].length; i++) {
        HTMLtypes += getTypeHTML(PokeData['Types'][i])
    };
    return /*html*/`
        <div id="Card${PokeData['PokemonID']}" onclick="showPokemonDetails('${PokeData['PokemonName']}')" class="card">
        <span>#${PokeData['PokemonID']}</span>    
        <div class="nameImgData">
                <span>${PokeData['PokemonName']}</span>
                <img class="imgPokemon" src="${PokeData['Img']}" alt="Bild">
            </div>
            <div class="typeData">
                ${HTMLtypes}
            </div>
        </div>`
}


function renderLoadingScreen(loadedValue,maxValue){
    let content = document.getElementById('PokedexCards');
    content.innerHTML = '';
    content.innerHTML = getLoadScreenHTML(loadedValue,maxValue);
    document.getElementById('loadBar').style.width = `${(loadedValue)/maxValue*100}%`;
}


function getLoadScreenHTML(loadedValue,maxValue){
    return /*html*/`
        <div id=loadBox>
            <span id=loadBar>${loadedValue} / ${maxValue+1}</span>
        </div>
    `
}


async function showPokemonDetails(PokemonName){
    await getPokemonData(PokemonName);
    document.getElementById('overlay').style.display = 'flex';
    renderPokemonData(0);
    setNextBtnEvent(PokemonName,NameListPokemon);
    setLastBtnEvent(PokemonName,NameListPokemon);
}


function setNextBtnEvent(PokemonName,NameList){
    let idx = getIdxOfPokemonInDataBase(PokemonName,NameList);
    if (idx < NameList.length-1) {
        document.getElementById('btnNextOvly').onclick =function(){
            let nameNextPokemon = NameList[idx+1]['PokemonName'];
            showPokemonDetails(nameNextPokemon);
        };
        document.getElementById('btnNextOvlyRes').onclick =function(){
            let nameNextPokemon = NameList[idx+1]['PokemonName'];
            showPokemonDetails(nameNextPokemon);
        };
    }

}


function setLastBtnEvent(PokemonName,NameList){
    let idx = getIdxOfPokemonInDataBase(PokemonName,NameList);
    if (idx > 0) {
        document.getElementById('btnLastOvly').onclick =function(){
            let nameNextPokemon = NameList[idx-1]['PokemonName'];
            showPokemonDetails(nameNextPokemon);
        };
        document.getElementById('btnLastOvlyRes').onclick =function(){
            let nameNextPokemon = NameList[idx-1]['PokemonName'];
            showPokemonDetails(nameNextPokemon);
        };
    }
}


function renderPokemonData(tab){
    renderPokemonDataHeader();
    renderPokemonDataTab(tab);
}


function renderPokemonDataHeader(){
    document.getElementById('PokemonNameOvlyCard').innerHTML = PokemonData[0]['Information']['Name'];
    document.getElementById('PokemonIDOvlyCard').innerHTML = `#${PokemonData[0]['Information']['ID']}`;
    let contentType = '';
    for (let i = 0; i < PokemonData[0]['Information']['Type'].length; i++) {
        contentType += getTypeHTML(PokemonData[0]['Information']['Type'][i]);
    }
    document.getElementById('wrapperHeaderTypesOvly').innerHTML = contentType;
    document.getElementById('PokemonWeightOvlyCard').innerHTML = `${+PokemonData[0]['Information']['Weight']/10} kg`;
    document.getElementById('PokemonHeightOvlyCard').innerHTML = `${+PokemonData[0]['Information']['Height']/10} m`;
    document.getElementById('PokemonHabitatOvlyCard').innerHTML = `${PokemonData[0]['Information']['Habitat']}`;
    document.getElementById('PokemonXpOvlyCard').innerHTML = `${PokemonData[0]['Information']['XP']}`;
    document.getElementById('PokemonIMGOvlyCard').src = `${PokemonData[0]['Information']['img']}`;
    setCardBgImg('overlayCardHeader',PokemonData[0]['Information']['Color']);
}


function renderPokemonDataTab(tabNr){
    let content = document.getElementById('tabData');
    content.innerHTML = '';
    switch (tabNr) {
        case 0:
            content.innerHTML = getTabHTMLBaseStats(0);
            styleHTMLBaseStats(0);
            setActiveTab(0);
            break;
        case 1:
            content.innerHTML = getTabHTMLAddInfo(0);
            setActiveTab(1);
            break;
        case 2:
            content.innerHTML = getTabHTMLEvolution(0);
            setActiveTab(2);
            break;
        default:
            content.innerHTML = getTabHTMLBaseStats(0);
            styleHTMLBaseStats(0);
            break;
    }
}


function getTabHTMLBaseStats(idx){
    return /*html*/`
        <div id="baseStats">
            <div class="statWrapper">
                <span class="OvlyStatName">HP: </span>
                <div class="statsBarBox">
                    <span>${PokemonData[idx]['BaseStats']['HP']}/255</span>
                    <div id="statBar0" class="statsBar"></div>
                </div>
            </div>
            <div class="statWrapper">
                <span class="OvlyStatName">Attack: </span>
                <div class="statsBarBox">
                    <span>${PokemonData[idx]['BaseStats']['Attack']}/190</span>
                    <div id="statBar1" class="statsBar"></div>
                </div>
            </div>
            <div class="statWrapper">
                <span class="OvlyStatName">Defence: </span>
                <div class="statsBarBox">
                    <span>${PokemonData[idx]['BaseStats']['Defence']}/250</span>
                    <div id="statBar2" class="statsBar"></div>
                </div>
            </div>
            <div class="statWrapper">
                <span class="OvlyStatName">Special Attack: </span>
                <div class="statsBarBox">
                    <span>${PokemonData[idx]['BaseStats']['SpecialAttack']}/194</span>
                    <div id="statBar3" class="statsBar"></div>
                </div>
            </div>
            <div class="statWrapper">
                <span class="OvlyStatName">Special Defence: </span>
                <div class="statsBarBox">
                    <span>${PokemonData[idx]['BaseStats']['SpecialDefence']}/250</span>
                    <div id="statBar4" class="statsBar"></div>
                </div>
            </div>
            <div class="statWrapper">
                <span class="OvlyStatName">Speed: </span>
                <div class="statsBarBox">
                    <span>${PokemonData[idx]['BaseStats']['Speed']}/200</span>
                    <div id="statBar5" class="statsBar"></div>
                </div>
            </div>
        </div>
    `
}


function styleHTMLBaseStats(idx){
    let keys = ['HP','Attack','Defence','SpecialAttack','SpecialDefence','Speed'];
    let maxValues = [255,190,250,194,250,200];
    for (let i = 0; i < keys.length; i++) {
        document.getElementById(`statBar${i}`).style.width = `${PokemonData[idx]['BaseStats'][keys[i]]/maxValues[i]*100}%`;
    }  
}


function getTabHTMLAddInfo(idx){
    let abilityHTML = [];
    for (let i = 0; i < PokemonData[idx]['AddInformation']['Abilities'].length; i++) {
        abilityHTML +=  `<span class="property"> ${PokemonData[idx]['AddInformation']['Abilities'][i]}</span>`;      
    }
    return /*html*/`
    <div id="addInfo">
        <div class="fieldInfo">
            <span>Abilities:</span>
            <div>
                ${abilityHTML}
            </div>
        </div>
        <div class="fieldInfo">
            <span>Growth Rate: </span>
            <span class="property">${PokemonData[idx]['AddInformation']['GrowthRate']}</span>
        </div>
        <div class="fieldInfo">
            <span>Base Happines: </span>
            <span class="property">${PokemonData[idx]['AddInformation']['Happines']}</span>
        </div>
        <div class="fieldInfo">
            <span>Shape: </span>
            <span class="property">${PokemonData[idx]['AddInformation']['Shape']}</span>
        </div>
        <div class="fieldInfo">
            <span>Pokemon Generation: </span>
            <span class="property">${PokemonData[idx]['AddInformation']['Generation']}</span>
        </div>
    </div>
`
}


function getTabHTMLEvolution(idx){
    let HTML = '';
    let nrEvolution = PokemonData[idx]['Evolution'].length;
    for (let i = 0; i < nrEvolution-1; i++) {
        HTML += /*html*/`
            <div class="evoImgName">
                <img onclick="showPokemonDetails('${PokemonData[idx]['Evolution'][i]['name']}')" src="${PokemonData[idx]['Evolution'][i]['img']}" alt="">
                <span>${PokemonData[idx]['Evolution'][i]['name']}</span>
            </div>
            <div class="evoArrow">
                <span>lvl ${PokemonData[idx]['Evolution'][i]['evolutionLvl']}</span>
                <img src="./img/arrow-right.svg" alt="Arrow">
                <span>${PokemonData[idx]['Evolution'][i]['evolutionnTrigger']}</span>
            </div>
        `
    }
    return /*html*/`
        <div id="wrapperEvoChain">
            ${HTML}
            <div class="evoImgName">
                <img onclick="showPokemonDetails('${PokemonData[idx]['Evolution'][nrEvolution-1]['name']}')" src="${PokemonData[idx]['Evolution'][nrEvolution-1]['img']}" alt="">
                <span>${PokemonData[idx]['Evolution'][nrEvolution-1]['name']}</span>
            </div>
        </div>
    ` 
}


function setActiveTab(tabNr){
    for (let i = 0; i < 3; i++) {
        document.getElementById(`tab${i}`).classList.remove('tabActive');
    }
    document.getElementById(`tab${tabNr}`).classList.toggle('tabActive');
}


function setDisplayStyleNone(HTMLID){
    document.getElementById(HTMLID).style.display = 'none';
}


function getTypeHTML(type){
            return /*html*/`
                <div class="PokemonType">
                    <img src="./img/icons/${type}.svg" alt="icon">
                    <span>${type}</span>
                </div>
            `
}


function setCardBgImg(CardId,Color){
    document.getElementById(CardId).style.backgroundImage = `url(./img/Pokeball/pokeball_${Color}.svg)`;
}


/* function to filter Pokemon*/
async function filterPokemon(){
    let url = 'https://pokeapi.co/api/v2/generation/';
    let nameListGeneration = await getNameListByCategorie('Generation',url,9);

    url = 'https://pokeapi.co/api/v2/pokemon-color/';
    let nameListColor = await getNameListByCategorie('Color',url,10);

    url = 'https://pokeapi.co/api/v2/type/';
    let nameListType = await getNameListByCategorie('Type',url,18);

    let nameListsFilter = [nameListGeneration,nameListColor,nameListType];
    let NameListPokemonAry = getNameListforFilter(nameListsFilter);
    if (NameListPokemonAry.length > 0) {
        await prepareDataToRender(NameListPokemonAry);
        sortNameListByID();
        renderPokedexCards(NameListPokemon);
    } else{
        alert('No Pokemon found for filter settings')
    }

}



function filterByName(){
    let nameList = [];
    let search = document.getElementById('iptSearchByName').value;
    search = search.toLowerCase();
    for (let i = 0; i < NameListPokemon.length; i++) {
        if (NameListPokemon[i]["PokemonName"].toLowerCase().includes(search)) {
            nameList.push ({PokemonName: NameListPokemon[i]['PokemonName']});
        }   
    }
    renderPokedexCards(nameList);
}


async function getNameListByCategorie(categorie,url,nrElements){
    let nameList = [];
    for (let i = 0; i < nrElements; i++) {
        setFilterElementStyleChecked(`${categorie}Field${i}`,false); 
        if (document.getElementById(`${categorie}Element${i}`).checked ) {
            let APIurl = url + (i+1);
            let response = await loadDatafromAPI(APIurl);
                if (categorie == 'Type') {
                    for (let ii = 0; ii < response['pokemon'].length; ii++) {
                        nameList.push(response['pokemon'][ii]['pokemon']['name']);
                    }
                } else {
                    for (let ii = 0; ii < response['pokemon_species'].length; ii++) {
                        nameList.push(response['pokemon_species'][ii]['name']);
                    }
                }
            setFilterElementStyleChecked(`${categorie}Field${i}`,true);    
        }
    }
    return nameList;
}


function getNameListforFilter(nameLists){
    let nameList = [];
    let uniqueNames = [];
    for (let i = 0; i < nameLists.length; i++) {
        uniqueNames = uniqueNames.concat(nameLists[i]);        
    }
    uniqueNames = getUniqueArrayElements(uniqueNames);
    for (let i = 0; i < uniqueNames.length; i++) {
        let addName = true;
        for (let ii = 0; ii < nameLists.length; ii++) {
            if (nameLists[ii].indexOf(uniqueNames[i]) == -1 && nameLists[ii].length > 0) {
                addName = false;
                break;
            }
        }
        if (addName) {
            nameList.push(uniqueNames[i]);
        }
    }
    return nameList;
}


function setFilterElementStyleChecked (elementID,checked){
    if (checked) {
        document.getElementById(elementID).style.backgroundColor = 'var(--drkClr1)';
        return
    }
    document.getElementById(elementID).style.backgroundColor = 'var(--drkClr3)';
}

/* help functions */

function getIdxOfPokemonInDataBase(PokemonName,Data){
    for (let i = 0; i < Data.length; i++) {
        if (Data[i]['PokemonName'] == PokemonName) {
            return i; // return idx if available
        }        
    }
    return -1;
}


function getUniqueArrayElements(array){
    let uniqueElements = [];
    for (let i = 0; i < array.length; i++) {
        if (uniqueElements.indexOf(array[i]) == -1) {
            uniqueElements.push(array[i]);
        }
    }
    return uniqueElements;
}


function sortNameListByID(){
    let data = PokemonBaseData[getIdxOfPokemonInDataBase(NameListPokemon[0]['PokemonName'],PokemonBaseData)];
    let nameListSorted = [{PokemonName:data['PokemonName']}];
    let idListSorted =[data['PokemonID']];
    for (let i = 1; i < NameListPokemon.length; i++) {
        data = PokemonBaseData[getIdxOfPokemonInDataBase(NameListPokemon[i]['PokemonName'],PokemonBaseData)];
        for (let ii = 0; ii < i; ii++) {
            if (idListSorted[ii]>data['PokemonID']) {
                nameListSorted.splice(ii,0,{PokemonName:data['PokemonName']});
                idListSorted.splice(ii,0,data['PokemonID']);
                break;
            } else if(ii == nameListSorted.length-1){
                nameListSorted.push({PokemonName:data['PokemonName']});
                idListSorted.push(data['PokemonID']);
            }
        }
    }
    NameListPokemon = nameListSorted;
}


async function getMaxStatValue (){
    let maxStatValue = [0,0,0,0,0,0]
    for (let i = 0; i < dataReference.length; i++) {
        console.clear();
        console.log(i);
        let url = dataReference[i]['PokemonURL'];
        let data = await loadDatafromAPI(url)
        for (let ii = 0; ii < 6; ii++) {
            if (maxStatValue[ii] < data['stats'][ii]['base_stat']) {
                maxStatValue[ii] = data['stats'][ii]['base_stat'];
            }
        }
    }
    console.log(maxStatValue);
}


function checkDBInconsistency(name){
    switch (name) {
        case 'deoxys':
            return '386';
        case 'wormadam':
            return '413';
        case 'giratina':
            return '487';
        case 'shaymin':
            return '492';
        case 'basculin':
            return '550';
        case 'darmanitan':
            return '555';   
        case 'tornadus':
            return '641';            
        case 'thundurus':
            return '642';        
        case 'landorus':
            return '645';        
        case 'keldeo':
            return '647';
        case 'meloetta':
            return '648'; 
        case 'meowstic':
            return '678';
        case 'aegislash':
            return '681';                       
        case 'pumpkaboo':
            return '710';  
        case 'gourgeist':
            return'711';          
        case 'zygarde':
            return '718';                     
        case 'oricorio':
            return '741';    
        case 'lycanroc':
            return '745';         
        case 'wishiwashi':
            return '746';            
        case 'minior':
            return '774';
        case 'mimikyu':
            return '778';
        case 'toxtricity':
            return'849';                       
        case 'eiscue':
            return '875';
        case 'indeedee':
            return '876';
        case 'morpeko':
            return '877';
        case 'urshifu':
            return '892';
        case 'basculegion':
            return'902';
        case 'enamorus':
            return '905';          
        default:
            return name;;
    }
    
}


function getPokemonImg(APIResponseJSON){
    if (APIResponseJSON['sprites']['other']['dream_world']['front_default'] == null) {
        return APIResponseJSON['sprites']['front_default'];
    }
    return APIResponseJSON['sprites']['other']['dream_world']['front_default'];
}
