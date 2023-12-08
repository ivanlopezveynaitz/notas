const express = require('express');
const router = express.Router();
const passport = require('passport');

//Modelo de datos de Usuario
const Usuario = require('../model/Users');

//Autenticación de usuarios
const { isAuthenticated } = require('../helpers/auth');

//Ruta para iniciar sesión
router.get('/users/signin', (req, res)=>{
    res.render('users/signin');
});

//Ruta para registrarse
router.get('/users/signup', (req, res)=>{
    res.render('users/signup');
});

//Ruta para post del formulario de registro
router.post('/users/signup', async (req, res)=>{
    const {nombre, email, password, confirmarpassword} = req.body;
    const errores = [];
    //console.log(nombre,email,password, confirmarpassword);
    if (!nombre){
        errores.push({text: 'Por favor inserta el nombre'});
    }
    if (!email){
        errores.push({text: 'Por favor inserta el email'});
    }
    if (!password){
        errores.push({text: 'Por favor inserta el password'});
    }
    if (password.length < 5){
        errores.push({text: 'La contraseña debe tener al menos 5 caracteres'});
    }
    if (password != confirmarpassword){
        errores.push({text: 'La confirmación de la contraseña no coincide'});
    }

    if (errores.length >0){
        res.render('users/signup',
        {
            errores,
            nombre,
            email,
            password,
            confirmarpassword
        })
    }else{ //No hay errores
        //Comprobamos que el email no esté registrado en la DB
        const emailUser = await Usuario.findOne({email: email});
        if (emailUser){
            //Si se encuentra en la db
            errores.push({text: 'El email ya está en uso, por favor elija uno nuevo'});
            res.render('users/signup',{
                errores,
                nombre,
                email,
                password,
                confirmarpassword
            });
            return;
        }//Fin de if

        //res.send('ok');
        const newUser = new Usuario({
            nombre,
            email,
            password
        });
        //Encriptamos la contraseña
        newUser.password = await newUser.encryptPassword (password);
        await newUser.save()
                     .then( ()=>{
                        //console.log(newUser);
                        req.flash('success_msg', 'Usuario registrado de manera exitosa');
                        res.redirect('/users/signin'); //Redirigimos el flujo de la app a iniciar sesión
                     })
                     .catch( (err)=>{
                        console.log(err);
                        res.redirect('/error');
                     })
    }//Fin del else no hay errores
}); //Fin del post del formulario de registro

//Método post para autenticar usuarios
router.post('/users/signin', passport.authenticate('local', {
    //Si todo va bien, lo direccionamos a notas
    successRedirect: '/notes',
    //Si hay algún error, lo direccionamos a signin
    failureRedirect: '/users/signin',
    //Activamos el envío de mensajes
    failureFlash:true
}));//Fin de post signin

router.get('/users/logout', (req, res, next)=>{
    req.logOut( (err)=>{
        if (err)
            return next(err);
        res.redirect('/')
    })
});//Fin de logout

//Ruta para listar los usuarios
router.get('/users',isAuthenticated, async (req, res)=>{
    await Usuario.find()
              .then( (users)=>{
                  res.render('users/consultar-users',{users})
              })
              .catch( (err)=>{
                  console.log(err);
                  res.redirect('error');
              })
});//Fin del método para listar los usuarios

//Ruta para agregar usuarios
router.get('/users/add', (req, res)=>{
    res.render('users/add-user');
});

//Ruta para guardar el formulario en la base de datos desde agregar usuarios
router.post('/users/add', async function(req, res){
    let { nombre, email, password, confirmarpassword, tipo} = req.body;
    const errores = []; //Arreglo para los errores en el registro de usuarios
    if (!nombre)
        errores.push({text: 'Por favor inserta el nombre'});
    if (!email)
        errores.push({text: 'Por favor inserta el email'});
    if (!password)
        errores.push({text: 'Por favor inserta el password'})
    if (password.length < 4)
        errores.push({text: 'La contraseña debe tener al menos 4 caracteres'});
    if (password != confirmarpassword)
        errores.push({text: 'Los passwords no coinciden'})
    if (errores.length > 0){ //Existe al menos un error en el formulario
        if (tipo == 0)
            tipo = null
        res.render('users/agregar-usuario', 
                    {
                      errores,
                      nombre,
                      email,
                      password,
                      confirmarpassword,
                      tipo
                    })
    }else { //No hay errores
        //Comprobamos que el email del usuario no exista en la base de datos
        const userEmail = await Usuario.findOne({email: email});
        if (userEmail){ //Si el userEmail existe en la base de datos
            errores.push({
                text: 'El email ya esta en uso, por favor elija uno diferente'
            });
            res.render('users/add-user',
            {
                errores,
                nombre,
                email,
                password,
                confirmarpassword,
                tipo
            })
            return; //finaliza la función
        } //if userEmail
        const newUser = new Usuario({
            nombre,
            email,
            password,
            tipo
        });

        //Encriptamos la contraseña
        newUser.password = await newUser.encryptPassword(password);

        //console.log(newUser);
        //Guardar el usuario en la base de datos
        await newUser.save()
                     .then( ()=>{
                         req.flash('success_msg', 'Usuario guardado de manera exitosa');
                         //Redirigimos el flujo de la app a iniciar sesión
                         res.redirect('/users'); 
                       })
                     .catch( (err)=>{
                        console.log(err);
                        res.redirect('/error')
                     });
    }  
});//Fin del post /users/add desde el formulario

//Ruta eliminar un usuario
router.get('/users/delete:id', isAuthenticated, async function(req, res){
    //Eliminamos los dos puntos del ObjectId que se envian en la url
    var _id = req.params.id;
    var len = req.params.id.length;
    _id = _id.substring(1,len);
    try {
        await Usuario.findByIdAndDelete(_id)
        req.flash('success_msg', 'Usuario eliminado correctamente');
        res.redirect('/users');
    } catch (error) {
        console.log(error);
        res.redirect('/error');
    }
});//Fin de eliminar un usuario

//Ruta para editar usuarios
router.get('/users/edit:id', isAuthenticated, async function (req, res){
    //Eliminamos los dos puntos del ObjectId que se envian en la url
    var _id = req.params.id;
    var len = req.params.id.length;
    _id = _id.substring(1,len);
    try {
        const usuario= await Usuario.findById(_id);
        var nombre = usuario.nombre;
        var email = usuario.email;
        var password = usuario.password;
        var tipo = usuario.tipo
        res.render('users/editar-usuario', {nombre, email, password, tipo, _id});
    } catch (error) {
        console.log(error);
        res.redirect('/error');
    }
}); //Fin de editar usuarios

//Metodo para actualizar un usuario en la base de datos recibida del formulario
router.post('/users/update/', isAuthenticated, async function(req, res){    
    let { nombre, email, password, tipo, id } = req.body;
    const errores = []; //Arreglo para los errores en el registro de usuarios

    if (!nombre)
        errores.push({text: 'Por favor inserta el nombre'});
    if (!password)
        errores.push({text: 'Por favor inserta el password'})
    if (password.length < 4)
        errores.push({text: 'La contraseña debe tener al menos 4 caracteres'});
    if (errores.length > 0){ //Existe al menos un error en el formulario
        const _id = id
        res.render('users/editar-usuario', 
                    {
                      errores,
                      nombre,
                      email,
                      password,
                      tipo,
                      _id
                    })
    }else { //No hay errores
        const newUser = new Usuario({
            nombre,
            email,
            password,
            tipo
        });
        //Encriptamos la contraseña
        newUser.password = await newUser.encryptPassword(password);
        password = newUser.password;
        //Actualizar en la base de datos
        await Usuario.findByIdAndUpdate(id, {nombre, email, password, tipo})
                .then( ( )=>{
                    req.flash('success_msg', 'Usuario actualizado correctamente');
                    res.redirect('/users')
                })
                .catch( (err)=>{
                    console.log(err);
                    res.redirect('/error');
                })
    }  
}); //Fin de editar-usuarios en base de datos

module.exports = router;    