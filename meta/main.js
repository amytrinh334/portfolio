import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line), 
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}


function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;
      let ret = {
        id: commit,
        url: 'https://github.com/vis-society/lab-7/commit/' + commit,
        author,
        date,
        time,
        timezone,
        datetime,
        hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
        totalLines: lines.length,
      };

      Object.defineProperty(ret, 'lines', {
        value: lines,
      });

      return ret;
    })
    .sort((a, b) => a.datetime - b.datetime);
}


function renderCommitInfo(data, commits) {
  d3.select('#stats').html('');

  d3.select('#stats').append('h2').text('Summary');

  const dl = d3.select('#stats').append('dl').attr('class', 'stats');

  // COMMITS
  dl.append('dt').text('Commits');
  dl.append('dd').text(commits.length);

  // FILES (Number of distinct files)
  const numFiles = d3.group(data, (d) => d.file).size;
  dl.append('dt').text('Files');
  dl.append('dd').text(numFiles);

  // TOTAL LOC (Lines of code)
  dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  // MAX DEPTH
  const maxDepth = d3.max(data, (d) => d.depth);
  dl.append('dt').text('Max Depth');
  dl.append('dd').text(maxDepth);

  // LONGEST LINE (Max length of a single line)
  const longestLine = d3.max(data, (d) => d.length);
  dl.append('dt').text('Longest Line');
  dl.append('dd').text(longestLine);

  // MAX LINES (Max lines in a single file)
  const maxLines = d3.max(data, (d) => d.line);
  dl.append('dt').text('Max Lines');
  dl.append('dd').text(maxLines);
}


let xScale;
let yScale;

function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;

  const svg = d3
  .select('#chart')
  .append('svg')
  .attr('viewBox', `0 0 ${width} ${height}`)
  .style('overflow', 'visible');

  xScale = d3
  .scaleTime()
  .domain(d3.extent(commits, (d) => d.datetime))
  .range([0, width])
  .nice();
  
  yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);

  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  const dots = svg.append('g').attr('class', 'dots');
  
  dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7) 
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1); 
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7); 
      updateTooltipVisibility(false);
    });

  const margin = { top: 10, right: 10, bottom: 30, left: 20 };

  const usableArea = {
  top: margin.top,
  right: width - margin.right,
  bottom: height - margin.bottom,
  left: margin.left,
  width: width - margin.left - margin.right,
  height: height - margin.top - margin.bottom, };
  
  xScale.range([usableArea.left, usableArea.right]);
  yScale.range([usableArea.bottom, usableArea.top]);

  const gridlines = svg
  .append('g')
  .attr('class', 'gridlines')
  .attr('transform', `translate(${usableArea.left}, 0)`);

  gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  const timeColorScale = d3.scaleLinear()
    .domain([0, 12, 24])
    .range(['steelblue', 'darkorange', 'steelblue']);

  gridlines.selectAll('line')
    .style('stroke', (d) => timeColorScale(d));

  const xAxis = d3.axisBottom(xScale);
  const yAxis = d3.axisLeft(yScale).tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

  svg
  .append('g')
  .attr('transform', `translate(0, ${usableArea.bottom})`)
  .attr('class', 'x-axis')
  .call(xAxis);
  
  svg
  .append('g')
  .attr('transform', `translate(${usableArea.left}, 0)`)
  .attr('class', 'y-axis')
  .call(yAxis);

  function isCommitSelected(selection, commit) {
    if (!selection) {
      return false;
    }
    
    const [x0, x1] = selection.map(d => d[0]);
    const [y0, y1] = selection.map(d => d[1]);
    
    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);
    
    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
  }

  function renderSelectionCount(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
      
    const countElement = document.querySelector('#selection-count');
    countElement.textContent = `${
      selectedCommits.length || 'No'
    } commits selected`;
    
    return selectedCommits;
  }


  function renderLanguageBreakdown(selection) {
    const selectedCommits = selection
      ? commits.filter((d) => isCommitSelected(selection, d))
      : [];
      
    const container = document.getElementById('language-breakdown');

    if (selectedCommits.length === 0) {
      container.innerHTML = '';
      return;
    }

    const requiredCommits = selectedCommits.length ? selectedCommits : commits;
    const lines = requiredCommits.flatMap((d) => d.lines);

    const breakdown = d3.rollup(
      lines,
      (v) => v.length,
      (d) => d.type
    );

    container.innerHTML = '';

    for (const [language, count] of breakdown) {
      const proportion = count / lines.length;
      const formatted = d3.format('.1~%')(proportion);

      container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
    }
  }

  function brushed(event) {
    const selection = event.selection;
    
    d3.selectAll('circle').classed('selected', (d) =>
      isCommitSelected(selection, d)
    );
    
    renderSelectionCount(selection);
    
    renderLanguageBreakdown(selection);
  }

  svg.call(d3.brush().on('start brush end', brushed));

  svg.selectAll('.dots, .overlay ~ *').raise();
}


function updateScatterPlot(data, commits) {
  const svg = d3.select('#chart').select('svg');

  xScale = xScale.domain(d3.extent(commits, (d) => d.datetime));

  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const xAxis = d3.axisBottom(xScale);

  const xAxisGroup = svg.select('g.x-axis');
  xAxisGroup.selectAll('*').remove();
  xAxisGroup.call(xAxis);

  const dots = svg.select('g.dots');
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  dots
    .selectAll('circle')
    .data(sortedCommits, (d) => d.id)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
}


function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const lines = document.getElementById('commit-lines');

  if (Object.keys(commit).length === 0) {
    link.href = '';
    link.textContent = '';
    date.textContent = '';
    time.textContent = '';
    author.textContent = '';
    lines.textContent = '';
    return;
  }

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });
  time.textContent = commit.time;
  author.textContent = commit.author;
  lines.textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}


let data = await loadData();
let commits = processCommits(data);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);


let colors = d3.scaleOrdinal(d3.schemeTableau10);

function updateFileDisplay(filteredCommits) {
  let lines = filteredCommits
    .flatMap((d) => d.lines)
    .filter(
      (d) =>
        !d.file.startsWith('node_modules/') &&
        d.file !== 'meta/loc.csv'
    );

  let files = d3
    .groups(lines, (d) => d.file)
    .map(([name, lines]) => {
      return { name, lines };
    })
    .sort((a, b) => b.lines.length - a.lines.length);

  const oldPositions = new Map();
  d3.select('#files')
    .selectAll(':scope > div')
    .each(function (d) {
      oldPositions.set(d.name, this.getBoundingClientRect().top);
    });

  let filesContainer = d3
    .select('#files')
    .selectAll(':scope > div')
    .data(files, (d) => d.name)
    .join((enter) =>
      enter.append('div').call((div) => {
        div.append('dt');
        div.append('dd');
      })
    )
    .order();

  filesContainer
    .select('dt')
    .html((d) => `<code>${d.name}</code><small>${d.lines.length} lines</small>`);

  const MAX_DOTS = 100;
  filesContainer
    .select('dd')
    .selectAll('div')
    .data((d) => d.lines.slice(0, MAX_DOTS))
    .join('div')
    .attr('class', 'loc')
    .attr('style', (d) => `--color: ${colors(d.type)}`);

  filesContainer.each(function (d) {
    const oldTop = oldPositions.get(d.name);
    if (oldTop === undefined) return; 

    const newTop = this.getBoundingClientRect().top;
    const deltaY = oldTop - newTop;

    if (deltaY !== 0) {
      this.style.transition = 'none';
      this.style.transform = `translateY(${deltaY}px)`;

      this.getBoundingClientRect();
      this.style.transition = 'transform 400ms ease';
      this.style.transform = 'translateY(0)';
    }
  });
}

// Helper function to generate commit descriptions inside any story container
function renderStory(selector) {
  d3.select(selector)
    .selectAll('.step')
    .data(commits)
    .join('div')
    .attr('class', 'step')
    .html(
      (d, i) => `
        On ${d.datetime.toLocaleString('en', {
          dateStyle: 'full',
          timeStyle: 'short',
        })},
        I made <a href="${d.url}" target="_blank">${
          i > 0
            ? 'another glorious commit'
            : 'my first commit, and it was glorious'
        }</a>.
        I edited ${d.totalLines} lines across ${
          d3.rollups(
            d.lines,
            (D) => D.length,
            (d) => d.file
          ).length
        } files.
        Then I looked over all I had made, and I saw that it was very good.
      `
    );
}

renderStory('#scatter-story');
renderStory('#files-story');

// Scrolly 1: Scatter plot
const scroller1 = scrollama();
scroller1
  .setup({
    container: '#scrolly-1',
    step: '#scrolly-1 .step',
  })
  .onStepEnter((response) => {
    const stepDate = response.element.__data__.datetime;
    const filtered = commits.filter((d) => d.datetime <= stepDate);
    updateScatterPlot(data, filtered);
  });

// Scrolly 2: File sizes unit visualization
const scroller2 = scrollama();
scroller2
  .setup({
    container: '#scrolly-2',
    step: '#scrolly-2 .step',
  })
  .onStepEnter((response) => {
    const stepDate = response.element.__data__.datetime;
    const filtered = commits.filter((d) => d.datetime <= stepDate);
    updateFileDisplay(filtered);
  });

updateFileDisplay(commits);