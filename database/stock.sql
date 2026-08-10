CREATE DATABASE stock_system;
USE stock_system;

CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO roles(nombre)
VALUES
('Administrador'),
('Empleado');

CREATE TABLE usuarios (

    id INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(100),

    apellido VARCHAR(100),

    usuario VARCHAR(50) UNIQUE,

    email VARCHAR(150) UNIQUE,

    password VARCHAR(255),

    rol_id INT,

    activo BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (rol_id) REFERENCES roles(id)

);

CREATE TABLE proveedores(

    id INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(150) NOT NULL,

    telefono VARCHAR(50),

    email VARCHAR(150),

    direccion VARCHAR(250),

    observaciones TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);

CREATE TABLE categorias(

    id INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(100) UNIQUE

);

CREATE TABLE marcas(

    id INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(100) UNIQUE

);

CREATE TABLE productos(

    id INT AUTO_INCREMENT PRIMARY KEY,

    codigo VARCHAR(50) UNIQUE,

    nombre VARCHAR(150),

    descripcion TEXT,

    categoria_id INT,

    marca_id INT,

    proveedor_id INT,

    activo BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(categoria_id) REFERENCES categorias(id),

    FOREIGN KEY(marca_id) REFERENCES marcas(id),

    FOREIGN KEY(proveedor_id) REFERENCES proveedores(id)

);

CREATE TABLE colores(

    id INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(50)

);

CREATE TABLE talles(

    id INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(20)

);

CREATE TABLE producto_variantes(

    id INT AUTO_INCREMENT PRIMARY KEY,

    producto_id INT,

    color_id INT,

    talle_id INT,

    codigo_barras VARCHAR(100),

    precio_costo DECIMAL(12,2),

    precio_venta DECIMAL(12,2),

    stock INT DEFAULT 0,

    stock_minimo INT DEFAULT 1,

    FOREIGN KEY(producto_id) REFERENCES productos(id),

    FOREIGN KEY(color_id) REFERENCES colores(id),

    FOREIGN KEY(talle_id) REFERENCES talles(id)

);

CREATE TABLE producto_imagenes(

    id INT AUTO_INCREMENT PRIMARY KEY,

    producto_id INT,

    ruta VARCHAR(250),

    principal BOOLEAN DEFAULT FALSE,

    FOREIGN KEY(producto_id) REFERENCES productos(id)

);