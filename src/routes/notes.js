const express = require('express');
const router = express.Router();

//Módulo para crear datos falsos de ejemplo
const {faker} = require('@faker-js/faker');

//Modelo de datos para las notas
const Nota = require('../model/Notes');

//Autenticación de usuarios
const { isAuthenticated } = require('../helpers/auth');

//Ruta para generar datos falsos aleatorios
router.get('/generate-fake-data', isAuthenticated, async (req, res)=>{
    let n = 30
    for( let i = 0; i < n; i++){
        //Tomamos el modelo de la base de datos de notas
        const newNote = new Nota();

        //Llenamos el objeto con datos aleatorios
        newNote.titulo = faker.string.alpha(10);
        newNote.descripcion = faker.string.alpha(25);
        newNote.usuario = req.user._id;

        //console.log(newNote);

        //Guardamos la nota en la base de datos
        await newNote.save()
                     .catch( (error)=>{
                        console.log(error);
                        res.redirect('/error');
                     })

    }; //Fin de for
    res.redirect('/notes');

}); //Fin de generar datos falsos


//Ruta para renderizar la página de búsqueda de notas
router.get('/notes/search', isAuthenticated, (req, res)=>{ 
    res.render('notes/buscar-notas');
});//Fin de get notes/search

//Ruta para la búsqueda de notas en el formulario
router.post('/notes/search', isAuthenticated, async (req, res)=>{
    //console.log(req.body.search);
    //res.send('WORKS');
    const user = req.user._id;
    const search = req.body.search;
 
    if (search){ //Si hay algo que buscar
       await Nota.find({ //Busca en cualquier atributo el texto, no es sensible a mayusculas
                        usuario: user, 
                        $text: {
                            $search: search,
                            $caseSensitive: false
                        }
                   })//Fin del find
                  .sort({date: 'desc'})
                  .then( (notas)=>{
                       //console.log(notas);
                       res.render('notes/buscar-notas',
                          {
                             search,
                             notas
                          }
                       );//render
                  })//Fin del then
                  .catch( (err)=>{
                          console.log(err);
                          res.redirect('/error');
                  });//catch
    }//if
 }); //Fin de post /notes/search

//Ruta para agregar notas
router.get('/notes/add', isAuthenticated, (req, res)=>{
    res.render('notes/nueva-nota');
});


//Cuando el formulario presione enviar
router.post('/notes/nueva-nota', isAuthenticated, async (req, res)=>{
    //req.body contiene todos los datos enviados desde el servidor
    //console.log(req.body);

    //Obtenemos los datos en constantes
    const {titulo, descripcion} = req.body;
    const errores = [];

    if (!titulo)
        errores.push({text: ' Por favor inserta el título'});

    if (!descripcion)
        errores.push({text: 'Por favor inserta la descripción'})

    if (errores.length > 0)
        res.render('notes/nueva-nota', {
            errores,
            titulo,
            descripcion
        });
    else{
        const id = req.user._id;
        const nuevaNota = new Nota({titulo, descripcion, usuario:id});
        await nuevaNota.save() //await guarda la nota en la db de manera asíncrona
                       .then( ()=>{
                          //Enviamos un mensaje al fronend indicando que la nota se almaceno
                          req.flash('success_msg', 'Nota agregada de manera exitosa');
                          //Redirigimos el flujo de la app a la lista de todas las notas
                          res.redirect('/notes');
                       })
                       .catch( (err)=>{
                          console.log(err);
                          //En caso de algún error redirigimos a una página de error
                          res.redirect('/error');
                       })
        //console.log(nuevaNota);
        //res.send("ok");
    }    
}); //Fin del método nueva-nota

//Ruta para editar una nota
router.get('/notes/edit:id', isAuthenticated, async (req, res)=>{
    //console.log(req.params.id);
    //Obtener el ObjectId que viene de la URL
    //Eliminamos los dos puntos que se incluyen al inicio
    try{
        var _id = req.params.id;
        var len = req.params.id.length;
        //Extrae una subcadena de la posición 1 a la logngitud total
        //del id, porque la posición 0 del id son los :
        //que vamos a eliminar
        _id = _id.substring(1, len);
        const nota = await Nota.findById(_id);
        id_ = nota._id
        var titulo = nota.titulo;
        var descripcion = nota.descripcion;
        res.render('notes/editar-nota',
                   {titulo, descripcion, _id})
    }
    catch(error){
        console.log(error);
        res.redirect('/error');
    }
});//Fin de editar nota

//Ruta para guardar una nota editada en la bd
router.put('/notes/editar-nota/:id', isAuthenticated, async (req, res)=>{
    const {titulo, descripcion} = req.body;
    const _id = req.params.id;
    //console.log(titulo, descripcion,_id);
    const errores = [];

    if (!titulo)
        errores.push({text: ' Por favor inserta el título'});

    if (!descripcion)
        errores.push({text: 'Por favor inserta la descripción'});
    
    if (errores.length > 0){
        res.render('notes/editar-nota', {
            errores,
            titulo,
            descripcion
        })
    }
    else{ //No hay errores se actualiza la nota en la bd
        await Nota.findByIdAndUpdate(_id, {titulo, descripcion}) 
                  .then( ()=>{
                    //Enviamos un mensaje al fronend indicando que la nota se almaceno
                    req.flash('success_msg', 'Nota actualizada de manera exitosa');
                    res.redirect('/notes');
                  })
                  .catch( (err)=>{
                    console.log(err);
                    res.redirect('/error');
                  })

    }//else
})//Fin de guardar nota editada

//Ruta para eliminar una nota
router.get('/notes/delete:id', isAuthenticated, async (req, res)=>{
    //Eliminar los dos puntos del id
    try {
         var _id = req.params.id;
         _id = _id.substring(1);
         await Nota.findByIdAndDelete(_id);
         req.flash('success_msg', 'Nota eliminada correctamente');
         res.redirect('/notes/')
    } catch (error) {
        res.send(404);
        console.log(error);
        res.redirect('/error')
    }
});//Fin de eliminar nota


//Rutas para Paginación

//Ruta para pedir una página de la páginación de notas de 6 notas por pagina
router.get('/notes/:page', isAuthenticated, async (req, res)=>{
    //Variable que nos indica cuantas notas por página deseamos
    let perPage= 6;
    
    //Variable que nos indica que número de página está solicitando el usuario
    //Si el usuario no envia nada, se renderiza la primera página de 6 notas
    let page = req.params.page || 1;

    //Variabla que indica a partir de que nota se va a mostrar en esta página
    //Por ejemplo en la página 1 se muestran las notas de 1 a la 6
    //se multiplica la página 1 * 6 notas de la página y le restamos el número de items
    //que muestra la página, en este caso 6, para que inice desde la nota 0

    //Página 1 - muestra de la nota 0 a la 5 (6 notas)
    //Página 2 - muestra de la nota 6 a la 12 (6 notas)

    let numNota = (perPage * page ) - perPage; //pagina 2 numNota = (6 * 2) - 6 = 6

    let total = 0; //almacena el total de notas para el usuario
    let numPages = 0; //almacena el número de páginas que se puede dividir el total de notas

    //Consultamos todas las notas para este usuario
    await Nota.find({usuario: req.user._id})
              .then( (notas)=>{
                   //notas es un arreglo que contiene los elementos regresados de la consulta
                   total = notas.length; //obtenemos el total de notas de la longitud del arreglo
                   if (total == 0){ //No hay notas en la bd 
                        //renderizamos la página sin notas
                        res.render('notes/consulta-notas', {
                            notas,
                            current: page,
                            pages: numPages
                        }); //render
                        return;
                   }//Fin de if           
              })//then
              .catch( (error)=>{
                console.log(error);
                res.redirect('/error');
              })//catch
    //Fin de find          

    //Mediante la palabra reservada skip, podemos omitir de la consulta de la base de datos
    //el número de registros indicado
    //con limit obtenemos únicamente 6 notas, es decir, obtenemos por ejemplo:
    //  para la página 1, la nota de la 1 a la 6,
    //  para la página 2, la nota de la 7 a la 12, etc.
    await Nota.find({usuario: req.user._id})
              .lean()
              .sort({fecha: 'desc'})
              .skip(numNota)
              .limit(perPage)
              .then( (notas) =>{
                    //Calculamos el total de páginas dividiendo el total de notas entre
                    //el número de notas por página y lo redondeamos al número superior
                    numPages = Math.ceil( total/perPage);
                    res.render('notes/consulta-notas', {
                        notas,
                        current: page,
                        pages: numPages
                    }); //render
                })//then
              .catch( (error)=>{
                console.log(error);
                res.redirect('/error');
              })//catch
});//Fin de la paginación de notas


//Ruta para listar las notas
router.get('/notes',isAuthenticated, async (req, res)=>{
    res.redirect('/notes/1');
    //res.send('Notas de la base de datos');
/*     await Nota.find({usuario: req.user._id})
              .lean().sort({fecha:'desc'})
              .then( (notas)=>{
                  //console.log(notas);
                  //res.send("Notas");
                  res.render('notes/consulta-notas',{notas})
              })
              .catch( (err)=>{
                  console.log(err);
                  res.redirect('error');
              })
 */});//Fin del método para listar las notas



module.exports = router;
