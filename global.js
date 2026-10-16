console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// Step 2 
// let navLinks = $$("nav a");

// let currentLink = navLinks.find(
//   (a) => a.host === location.host && a.pathname === location.pathname
// );

// currentLink?.classList.add('current');


// Step 3
const ARE_WE_HOME = document.body.classList.contains('home');

let pages = [
  { url: ARE_WE_HOME ? 'index.html' : '../index.html', title: 'Home' },
  { url: ARE_WE_HOME ? 'projects/index.html' : '../projects/index.html', title: 'Projects' },
  { url: ARE_WE_HOME ? 'resume/index.html' : '../resume/index.html', title: 'Resume' },
  { url: ARE_WE_HOME ? 'contact/index.html' : '../contact/index.html', title: 'Contact' },
  { url: 'https://github.com/amytrinh334', title: 'GitHub Profile' }
];

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;

  let a = document.createElement('a');
  a.href = url;
  a.textContent = title;

  a.classList.toggle(
    'current',
    a.host === location.host && a.pathname === location.pathname
  );

  if (a.host !== location.host) {
    a.target = "_blank";
  }

  nav.append(a);
}



// Step 4
document.body.insertAdjacentHTML(
  'afterbegin',
  `
    <label class="color-scheme">
      Theme:
      <select>
        <option value="light dark">Automatic</option> 
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  `
); 

let select = document.querySelector('.color-scheme select'); 

if ("colorScheme" in localStorage) {
  document.documentElement.style.setProperty('color-scheme', localStorage.colorScheme); 
  select.value = localStorage.colorScheme; 
}

select.addEventListener('input', function (event) {
  console.log('color scheme changed to', event.target.value); 
  
  document.documentElement.style.setProperty('color-scheme', event.target.value); 
  
  localStorage.colorScheme = event.target.value;
});


// Contact Form
let form = document.querySelector('form');

form?.addEventListener('submit', function (event) {
  event.preventDefault();

  let data = new FormData(form);

  let url = form.action + "?";
  let params = [];

  for (let [name, value] of data) {
    params.push(name + "=" + encodeURIComponent(value));
  }

  url += params.join("&"); 

  location.href = url;
});