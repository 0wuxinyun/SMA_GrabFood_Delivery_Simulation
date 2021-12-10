var WINDOWBORDERSIZE = 10;
var HUGE = 999999; //Sometimes useful when testing for big or small numbers
var animationDelay = 300; //controls simulation and transition speed
var isRunning = false; // used in simStep and toggleSimStep
var surface; // Set in the redrawWindow function. It is the D3 selection of the svg drawing surface
var simTimer; // Set in the initialization function

//The drawing surface will be divided into logical cells
var maxCols = 40;
var cellWidth; //cellWidth is calculated in the redrawWindow function
var cellHeight; //cellHeight is calculated in the redrawWindow function

const urlCustomer="images/Customer.png";
const urlDeliever = "images/Deliever.png";
const urlRestaurant ="images/Restaurant.png"

//Stage for agents
const TOCUSTOMER=0;
const TORESTAURANT=1;
const RANDOM = 2;

const WAITING=0;
const EXIT=1;

const BUSY=0;
const IDLE=1;

// Dynamic list
var customers = [];
var restaurants =[];
var delievers=[];

var customer_waiting_list=[];
var restaurant_waiting_list=[]
// We can section our screen into different areas. In this model, the areas represent solely the city.
var srow=2
var nrow=maxCols/2.1-3
var scol=2
var ncol=maxCols/2.1-2

var areas =[
 {"label":"City","startRow":srow,"numRows":nrow,"startCol":scol,"numCols":ncol,"color":"#FFCC99"},	
]

// pqrameters
var currentTime = 0;
var number_deliver =5;
var number_restaranut = 7;
var number_customer= 7;
var probArrival = 0.5;
var expoentialrate=0.6;
// Add building and path
// We need to add buildings to the city. These buildings should be equally spaced from 3 to 3 cells. You can modify the spacing
// Buildings is a empty list
var Buildings = [];
var barriers=[]
//Function used to compute the coordinates of each building
// Compute feasible row coordinates and column coordinates
function range(start, end, step = 1) {
	const len = Math.floor((end - start) / step) + 1
	return Array(len).fill().map((_, idx) => start + (idx * step))
  }
  var rowBuildings = range(srow, srow+nrow, 3);
  var colBuildings = range(scol+1, scol+ncol, 3);

// Generate row and col for number_restaranut
var i_r=0;
var r_row=[];
var r_col=[];
while(i_r<number_restaranut){
	i_r=i_r+1;
	const row = rowBuildings[Math.floor(Math.random() * rowBuildings.length)];
	const col = colBuildings[Math.floor(Math.random() * colBuildings.length)];
	// BUG: cannot generate at the same place
	r_row.push(row);
	r_col.push(col);
}
i_r=0;
//Create all possible combinations of building coordinates
var IsRestaurant=false;
for (var i = 0; i < rowBuildings.length; i++) {
	for (var j = 0; j < colBuildings.length; j++){
		for(var index=0; index<number_restaranut;index++)
		{
			if(rowBuildings[i]==r_row[index]&& colBuildings[j]==r_col[index]){
				IsRestaurant=true;
			}
		}
		if (IsRestaurant) {
			var newrestarant ={"id":++i_r,"location":{"row":rowBuildings[i], "col":colBuildings[j]},
			"state":IDLE,"timeAdmitted":0,"target":[],"Cook":false};
	    	restaurants.push(newrestarant);

		}
		else{
		var newbuilding ={"row":rowBuildings[i], "col":colBuildings[j]};
	    Buildings.push(newbuilding); }
		IsRestaurant=false;
		var newbarrier ={"row":rowBuildings[i], "col":colBuildings[j]};
		barriers.push(newbarrier);
	}
  }
// Help functions
function getRandomInt(max) {
	return Math.floor(Math.random() * max);
  }
  // discrete approx of exponential distribution
function randomExponential(rate) {
	rate = rate || 1;
  
	// Allow to pass a random uniform value or function
	// Default to Math.random()
	var U  = Math.random();
  
	return -Math.log(U)/rate;
  }
function randomGeometric(successProbability) {
	successProbability = successProbability || 1 - Math.exp(-1); // Equivalent to rate = 1
  
	var rate = -Math.log(1 - successProbability);
  
	return Math.floor(randomExponential(rate));
  }
// SETTING
// This next function is executed when the script is loaded. It contains the page initialization code.
(function() {
	// Your page initialization code goes here
	// All elements of the DOM will be available here
	window.addEventListener("resize", redrawWindow); //Redraw whenever the window is resized
	simTimer = window.setInterval(simStep, animationDelay); // call the function simStep every animationDelay milliseconds
	// Initialize the slider bar to match the initial animationDelay;
	
	redrawWindow();
})();

// We need a function to start and pause the simulation.
function toggleSimStep(){ 
	//this function is called by a click event on the html page. 
	// Search BasicAgentModel.html to find where it is called.
	isRunning = !isRunning;
	console.log("isRunning: "+isRunning);
}

function redrawWindow(){
	isRunning = false; // used by simStep
	window.clearInterval(simTimer); // clear the Timer
    animationDelay = 550 - document.getElementById("slider1").value; 
	simTimer = window.setInterval(simStep, animationDelay); // call the function simStep every animationDelay milliseconds
	
	// Re-initialize simulation variables
	currentTime = 0;
    delievers = [];
	i_d=0;
	i_r=0;
	//resize the drawing surface; remove all its contents; 
	var drawsurface = document.getElementById("surface");
	var creditselement = document.getElementById("credits");
	var w = window.innerWidth;
	var h = window.innerHeight;
	var surfaceWidth =(w - 3*WINDOWBORDERSIZE);
	var surfaceHeight= (h-creditselement.offsetHeight - 3*WINDOWBORDERSIZE);
	
	drawsurface.style.width = surfaceWidth+"px";
	drawsurface.style.height = surfaceHeight+"px";
	drawsurface.style.left = WINDOWBORDERSIZE/2+'px';
	drawsurface.style.top = WINDOWBORDERSIZE/2+'px';
	drawsurface.style.border = "thick solid #0000FF"; //The border is mainly for debugging; okay to remove it
	drawsurface.innerHTML = ''; //This empties the contents of the drawing surface, like jQuery erase().
	
	// Compute the cellWidth and cellHeight, given the size of the drawing surface
	numCols = maxCols;
	cellWidth = surfaceWidth/numCols;
	numRows = Math.ceil(surfaceHeight/cellWidth);
	cellHeight = surfaceHeight/numRows;
	
	// In other functions we will access the drawing surface using the d3 library. 
	//Here we set the global variable, surface, equal to the d3 selection of the drawing surface
	surface = d3.select('#surface');
	surface.selectAll('*').remove(); // we added this because setting the inner html to blank may not remove all svg elements
	surface.style("font-size","100%");
	// rebuild contents of the drawing surface
	updateSurface();	
};

// The window is resizable, so we need to translate row and column coordinates into screen coordinates x and y
function getLocationCell(location){
	var row = location.row;
	var col = location.col;
	var x = (col-1)*cellWidth; //cellWidth is set in the redrawWindow function
	var y = (row-1)*cellHeight; //cellHeight is set in the redrawWindow function
	return {"x":x,"y":y};
}


// D3
function updateSurface(){
	// This function is used to create or update most of the svg elements on the drawing surface.
	// See the function removeDynamicAgents() for how we remove svg elements
	
	//Select all svg elements of class "citizen" and map it to the data list called patients
	var alldelivers = surface.selectAll(".deliver").data(delievers);

	// If the list of svg elements is longer than the data list, the excess elements are in the .exit() list
	// Excess elements need to be removed:
	alldelivers.exit().remove(); //remove all svg elements associated with entries that are no longer in the data list
	// (This remove function is needed when we resize the window and re-initialize the citizens array)
	 
	// If the list of svg elements is shorter than the data list, the new elements are in the .enter() list.
	// The first time this is called, all the elements of data will be in the .enter() list.
	// Create an svg group ("g") for each new entry in the data list; give it class "citizen"
	var newdelivers = alldelivers.enter().append("g").attr("class","deliver"); 

	//Append an image element to each new citizen svg group, position it according to the location data, and size it to fill a cell
	// Also note that we can choose a different image to represent the citizen based on the citizen type
	newdelivers.append("svg:image")
	 .attr("x",function(d){var cell= getLocationCell(d.location); return cell.x+"px";})
	 .attr("y",function(d){var cell= getLocationCell(d.location); return cell.y+"px";})
	 .attr("width", Math.min(cellWidth,cellHeight)+"px")
	 .attr("height", Math.min(cellWidth,cellHeight)+"px")
	 .attr("xlink:href",urlDeliever);
	
	// For the existing citizens, we want to update their location on the screen 
	// but we would like to do it with a smooth transition from their previous position.
	// D3 provides a very nice transition function allowing us to animate transformations of our svg elements.
	
	//First, we select the image elements in the allcitizens list
	var images = alldelivers.selectAll("image");
	// Next we define a transition for each of these image elements.
	// Note that we only need to update the attributes of the image element which change
	images.transition()
	 .attr("x",function(d){var cell= getLocationCell(d.location); return cell.x+"px";})
     .attr("y",function(d){var cell= getLocationCell(d.location); return cell.y+"px";})
     .attr("xlink:href",urlDeliever)
	 .duration(animationDelay).ease('linear'); // This specifies the speed and type of transition we want.
 
	
	// Finally, we would like to draw boxes around the different areas of our system. We can use d3 to do that too.

	//First a box representing the city
	var allareas = surface.selectAll(".areas").data(areas);
	var newareas = allareas.enter().append("g").attr("class","areas");
	// For each new area, append a rectangle to the group
	newareas.append("rect")
	.attr("x", function(d){return (d.startCol-1)*cellWidth;})
	.attr("y",  function(d){return (d.startRow-1)*cellHeight;})
	.attr("width",  function(d){return d.numCols*cellWidth;})
	.attr("height",  function(d){return d.numRows*cellWidth;})
	.style("fill", function(d) { return d.color; })
	.style("stroke","black")
	.style("stroke-width",1);

	//Second, boxes representing the buildings
	var allbuildings = surface.selectAll(".Buildings").data(Buildings);
	var newbuildings = allbuildings.enter().append("g").attr("class","Buildings");
	newbuildings.append("rect")
	.attr("x", function(d){return (d.col-1)*cellWidth;})
	.attr("y",  function(d){return (d.row-1)*cellHeight;})
	.attr("width",  function(d){return 1*cellWidth;})
	.attr("height",  function(d){return 1*cellWidth;})
	.style("fill", function(d) { return "#CC6600"; })
	.style("stroke","black")
	.style("stroke-width",1);

	//THIRD , restaurant buildings
	var allrestaurant = surface.selectAll(".restaurants").data(restaurants);
	var newrestaurants = allrestaurant.enter().append("g").attr("class","restaurants");
	newrestaurants.append("svg:image")
	 .attr("x",function(d){var cell= getLocationCell(d.location); return cell.x+"px";})
	 .attr("y",function(d){var cell= getLocationCell(d.location); return cell.y+"px";})
	 .attr("width", Math.min(cellWidth,cellHeight)+"px")
	 .attr("height", Math.min(cellWidth,cellHeight)+"px")
	 .attr("xlink:href",urlRestaurant);

	// Forth. Customer building
	var allcustomers= surface.selectAll(".customers").data(customers);
	allcustomers.exit().remove();
	var newcustomer = allcustomers.enter().append("g").attr("class","customers");
	newcustomer.append("svg:image")
	 .attr("x",function(d){var cell= getLocationCell(d.location); return cell.x+"px";})
	 .attr("y",function(d){var cell= getLocationCell(d.location); return cell.y+"px";})
	 .attr("width", Math.min(cellWidth,cellHeight)+"px")
	 .attr("height", Math.min(cellWidth,cellHeight)+"px")
	 .attr("xlink:href",urlCustomer);
	
}



var i_d=0;
var i_c=0;
// Main loop
// Add
function addDynamicAgents(){
    // Add delivers
    while(i_d<number_deliver){
        i_d=i_d+1;
        // randome generate the birth locations
        var randombuilding = Math.floor(Math.random() * (Buildings.length));
        var home=Buildings[randombuilding]
        var homerow=home.row;
        var homecol=home.col;
        var targetrow=Math.floor(Math.random() * ((nrow+srow) - srow) +srow)
        var targetcol=Math.floor(Math.random() * ((ncol+scol) - scol) +scol)
        var targetisbuilding=Buildings.filter(function(d){return d.row==targetrow && d.col==targetcol;});
        while (targetisbuilding.length>0){
        targetrow=Math.floor(Math.random() * ((nrow+srow) - srow) +srow)
        targetcol=Math.floor(Math.random() * ((ncol+scol) - scol) +scol)
        targetisbuilding=Buildings.filter(function(d){return d.row==targetrow && d.col==targetcol;});    
        }
        // delivers is set as RANDOM stage as beginging with finding random place to go
        var new_deliver={"id":i_d,"location":{"row":homerow,"col":homecol},
        "target":{"row":targetrow,"col":targetcol},"state":RANDOM,"timeAdmitted":0};
        delievers.push(new_deliver)
    };


	// add customers
	if (Math.random()< probArrival){
        var randombuilding = Math.floor(Math.random() * (Buildings.length));
        var home=Buildings[randombuilding]
        var homerow=home.row;
        var homecol=home.col;
		// Assign one restaurant to the customer: 1 to len
		const target=getRandomInt(restaurants.length)+1;
        var newcustomer = {"id":++i_c,"targer":target,"location":{"row":homerow,"col":homecol},"state":WAITING,"timeAdmitted":0};	
		// change the restaurant to be busy
		var restaurant=restaurants[target-1];
		restaurant.state=BUSY;
		var neworder={"location":{"row":homerow,"col":homecol}};
		restaurant.target.push(neworder);
    customers.push(newcustomer);
	}
    

	}

//Update
function updateDeliver(deliverIndex){
	//deliverIndex is an index into the deliver data array
	deliverIndex = Number(deliverIndex);
	var deliver = delievers[deliverIndex];
	// get the current location of the citizen
	var row = deliver.location.row;
    var col = deliver.location.col;
	var state = deliver.state;
	
	// determine if citizen has arrived at the target
	var hasArrived = (Math.abs(deliver.target.row-row)+Math.abs(deliver.target.col-col))==0;
	
   	// Behavior of citizen depends on his or her state
	switch(state){
        // If random
        case RANDOM:
            // check if order comes?
            // arrivled : find another place to random 
            if (hasArrived) {
                // FIND A NEW
				var targetrow=Math.floor(Math.random() * ((nrow+srow) - srow) +srow);
				var targetcol=Math.floor(Math.random() * ((ncol+scol) - scol) +scol);
				var targetisbuilding=Buildings.filter(function(d){return d.row==targetrow && d.col==targetcol;});
				while (targetisbuilding.length>0){
					targetrow=Math.floor(Math.random() * ((nrow+srow) - srow) +srow);
					targetcol=Math.floor(Math.random() * ((ncol+scol) - scol) +scol);
					targetisbuilding=Buildings.filter(function(d){return d.row==targetrow && d.col==targetcol;});    
					}
					deliver.target.row = targetrow;
					deliver.target.col = targetcol;
            };

		break;

		default:
        break;
        
	}
	// UPDATE
	   // set the current row and column of the citizen
	   var currentrow=deliver.location.row;
	   var currentcol=deliver.location.col;
	
	   // set the destination row and column
	   var targetRow = deliver.target.row;
	   var targetCol = deliver.target.col;
	   
	   //Compute all possible directions for a citizen
	   var nextsteps=[];
		for(const dx of [-1, 0, 1]) {
			for(const dy of [-1, 0, 1]) {
			  if(dx === 0 && dy === 0) continue;
			  nextsteps.push({ row: currentrow + dx, col: currentcol + dy });
		   }
		}
	
		// Compute distance of each possible step to the destination
		stepdistance=[]
		for (i = 0; i < nextsteps.length-1; i++) {
			var nextstep=nextsteps[i];
			var nextrow=nextstep.row
			var nextcol=nextstep.col
			stepdistance[i]=Math.sqrt((nextrow-targetRow)*(nextrow-targetRow)+(nextcol-targetCol)*(nextcol-targetCol));
		} 
	
		//identify if the best next step (i.e. the step with the shortest distance to the target) is a building
		var indexMin = stepdistance.indexOf(Math.min(...stepdistance));
		var minnexstep=nextsteps[indexMin];
		var nextsteprow=minnexstep.row;
		var nextstepcol=minnexstep.col;
		
		var nextstepisbuilding=barriers.filter(function(d){return d.row==nextsteprow && d.col==nextstepcol;});
		 //If the best next step is a building, then we analyze the 2nd best next step...etc, until the next step is not a building
		//Citizens cannot move through the buildings!
		while (nextstepisbuilding.length>0){
			nextsteps.splice((indexMin), 1);
			stepdistance.splice((indexMin), 1);
			var indexMin = stepdistance.indexOf(Math.min(...stepdistance));
			var minnexstep=nextsteps[indexMin];
			var nextsteprow=minnexstep.row;
			var nextstepcol=minnexstep.col;
			var nextstepisbuilding=barriers.filter(function(d){return d.row==nextsteprow && d.col==nextstepcol;});
		}
		
		// compute the cell to move to
		var newRow = nextsteprow;
		var newCol = nextstepcol;
		
		// update the location of the citizen
		deliver.location.row = newRow;
		deliver.location.col = newCol;
		
	
}

function updateCustomers(customerIndex){
	//citizenIndex is an index into the citizens data array
	customerIndex = Number(customerIndex);
	var customer = customers[customerIndex];
	// get the current location of the citizen
	var row = customer.location.row;
	var col = customer.location.col;
	var state = customer.state;
	
	// Check deliver has arrived?
	
	switch(state){
		case WAITING:
			// if arrived update to exit 

			break;
		default:
		break;

		
	}
		
}

//newrestarant ={"id":++i_r,"location":{"row":rowBuildings[i], "col":colBuildings[j]},"state":IDLE,"timeAdmitted":0};
function updateResaurant(restaurantIndex){
	restaurantIndex = Number(restaurantIndex);
	var restaurant = restaurants[restaurantIndex];
	// get the current location of the citizen
	var row = restaurant.location.row;
	var col = restaurant.location.col;
	var state = restaurant.state;
	var id = restaurant.id;

	
	// Check deliver has arrived?
	
	switch(state){
		case IDLE:
			// IDLE
			break;
		case BUSY:
			if (restaurant.target.length>0) {
				// check if is cook other orders
				if(restaurant.Cook==false){
				// just start 
				restaurant.Cook=true;
				var order = restaurant.target.shift();
				// update Currenttime
				var service_time=randomGeometric(expoentialrate);
				var end_time=currentTime+service_time;
				// find a driver:
				// If driver come near the restaurant it will be ask to take this order if it's idle
			}
			}
			break;
		default:
		break;

		
	}
		
}
     

function updateDynamicAgents(){
	// loop over all the citizens and update their states
	for (var deliverIndex in delievers){
		updateDeliver(deliverIndex);
	};
	for (var customerIndex in customers){
		updateCustomers(customerIndex);
	};
	for(var restaurantIndex in restaurants){
		updateResaurant(restaurantIndex);
	};

	updateSurface();	
}

// remove
function removeDynamicAgents(){
	// Delivers cannot remove
	// remove exit stage customers
	var allcustomers = surface.selectAll(".customers").data(customers);
	//Select all the svg groups of class "citizens" whose state is EXITED
	var exitedcustomers = allcustomers.filter(function(d,i){return d.state==EXIT;});
	// Remove the svg groups of EXITED citizens: they will disappear from the screen at this point
	exitedcustomers.remove();
	// Remove the EXITED citizens from the citizens list using a filter command
	customers = customers.filter(function(d){return d.state!=EXIT;});
	// At this point the citizens list should match the images on the screen one for one 
	// and no citizens should have state EXITED
}

function simStep(){
	//This function is called by a timer; if running, it executes one simulation step 
	//The timing interval is set in the page initialization function near the top of this file
	if (isRunning){ //the isRunning variable is toggled by toggleSimStep
		// Increment current time (for computing statistics)
		currentTime++;
		// Sometimes new agents will be created in the following function
		addDynamicAgents();
		// In the next function we update each agent
		updateDynamicAgents();
		// Sometimes agents will be removed in the following function
        removeDynamicAgents();

	}
}
	
