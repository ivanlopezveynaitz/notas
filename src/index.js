const express = require('express');
const path = require('path');
const { engine } = require('express-handlebars');
const methodOverride = require('method-override');
const session = require('express-session'); //Sessiones del usuario
const flash = require('connect-flash'); 
const passport = require('passport')

//Inicializaciones
const app = express();
require('./database'); 
require('./config/passport')

//Configuraciones
app.set('puerto', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.engine('.hbs', engine({
    defaultLayout:'main',
    defaultDir: path.join('views', 'layouts'),
    partialsDir: path.join(__dirname,'views', 'partials'),
    extname: 'hbs',
    runtimeOptions: {
        allowProtoMethodsByDefault:true,
        allowProtoPropertiesByDefault:true
    },
    helpers: {
        equal: function(lvalue, rvalue, options){
            if (lvalue != rvalue)
                return options.inverse(this);
            else
                return options.fn(this);
        },//equal 
        for: function(current, pages, options){
            current = Number(current);
            pages = Number(pages);   

            var code = '';
            //Inicializamos la variable i con la paginación inicial
            //Si la variable i > a 3 le restamos 2 y si no 
            //es mayor a 3 la inicializamos en 1
            var i = current > 3 ? current - 2 : 1;

            //Si el índice i es mayor a 1, es porque
            //necesitamos renderizar solo algunas páginas
            if (i !== 1){
                let last = i - 1;
                code +='<li class="page-item mr-1">'
                     + '   <a href="/notes/' + last + '" class="page-link">...</a>'
                     + '</li>'
            }//if

            //Imprimimos los links intermedios
            for(; i < (current +3) && i <=pages; i++){
                if (i == current){
                   code +='<li class="page-item active mr-1">'
                   + '      <a href="' + i + '" class="page-link">' + i + '</a>'
                   + '</li>'                
                }else {
                   code +='<li class="page-item mr-1">'
                   + '   <a href="/notes/' + i + '" class="page-link">'+ i + '</a>'
                   + '</li>' 
                }//else
                //Si hay más páginas que mostrar incluimos después del for
                //puntos suspensivos para indicar que existen más páginas
                //antes del final
                if (i == (current + 2) && i < pages){
                    let last = i+1;
                    code +='<li class="page-item mr-1">'
                    + '   <a href="/notes/' + last + '" class="page-link">...</a>'
                    + '</li>'
                }//if
            }//ciclo for
            return options.fn(code);
       }//for - helpers        
    },//helpers     
}));
app.set('view engine','hbs');

//Middleware
app.use(express.urlencoded({extended:false}));
app.use(methodOverride('_method')); //delete, put, get
app.use(session({
    secret: 'mysecretapp',
    resave: true,
    saveUninitialized:true
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

//Variables Globales
app.use( (req, res, next)=>{
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.usuario = req.user || null;
    
    next();
})
//Rutas
app.use(require('./routes/index'));
app.use(require('./routes/notes'));
app.use(require('./routes/users'));

//Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

//Servidor
app.listen(app.get('puerto'), ()=>{
    let puerto = app.get('puerto');
    console.log('Servidor corriendo en el puerto ' + puerto);
})
