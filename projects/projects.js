import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');

renderProjects(projects, projectsContainer, 'h2');

let projectsTitle = document.querySelector('.projects-title');

if (projectsTitle) {
  projectsTitle.textContent = `${projects.length} Projects`;
}

let query = '';
let selectedYear = null;

function filterProjects() {
  return projects.filter((project) => {
    let matchesQuery = Object.values(project).join('\n').toLowerCase().includes(query);
    let matchesYear = selectedYear ? project.year === selectedYear : true;
    
    return matchesQuery && matchesYear;
  });
}


let selectedIndex = -1;

let arc = d3.arc().innerRadius(0).outerRadius(50)({
  startAngle: 0,
  endAngle: 2 * Math.PI,
});


let rolledData = d3.rollups(
  projects,
  (v) => v.length,
  (d) => d.year
);

let data = rolledData.map(([year, count]) => {
  return { value: count, label: year };
});

let arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
let colors = d3.scaleOrdinal(d3.schemeTableau10);

function renderPieChart(projectsGiven) {
  let newSVG = d3.select('svg'); 
  newSVG.selectAll('path').remove();
  d3.select('.legend').selectAll('li').remove();

  let newRolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year
  );

  let newData = newRolledData.map(([year, count]) => {
    return { value: count, label: year }; 
  });

  let newSliceGenerator = d3.pie().value((d) => d.value);
  let newArcData = newSliceGenerator(newData);
  let newArcs = newArcData.map((d) => arcGenerator(d));

  newArcs.forEach((arc, i) => {
  newSVG.append('path')
        .attr('d', arc)
        .attr('fill', colors(i))
        .on('click', () => {
            selectedIndex = selectedIndex === i ? -1 : i;
            selectedYear = selectedIndex === -1 ? null : newData[selectedIndex].label;
            
            if (selectedIndex === -1) {
                renderProjects(projectsGiven, projectsContainer, 'h2');
            } else {
                let selectedYear = newData[selectedIndex].label;

                let filteredProjects = filterProjects();
                renderProjects(filteredProjects, projectsContainer, 'h2');
            }

            newSVG
              .selectAll('path')
              .attr('class', (_, idx) => (
                idx === selectedIndex ? 'selected' : ''
              ));
              
            legend
              .selectAll('li')
              .attr('class', (_, idx) => (
                idx === selectedIndex ? 'selected' : '' 
              ));
        });
    });

  let legend = d3.select('.legend');
  newData.forEach((d, idx) => {
    legend.append('li')
          .attr('style', `--color:${colors(idx)}`)
          .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
  });
}

renderPieChart(projects);

let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('change', (event) => {
  query = event.target.value.toLowerCase();
  
  let filteredProjects = filterProjects();

  renderProjects(filteredProjects, projectsContainer, 'h2');
  renderPieChart(filteredProjects);
});