<?php

declare(strict_types=1);

namespace App;

enum ConversationStep: string
{
    case WELCOME = 'WELCOME';
    case NOMBRE = 'NOMBRE';
    case TELEFONO = 'TELEFONO';
    case CORREO = 'CORREO';
    case ESTADO = 'ESTADO';
    case CIUDAD = 'CIUDAD';
    case COLONIA_CP = 'COLONIA_CP';
    case INGRESO = 'INGRESO';
    case INGRESO_SKIP = 'INGRESO_SKIP';
    case RAMO = 'RAMO';
    case RAMO_INFERIR = 'RAMO_INFERIR';
    case RESUMEN = 'RESUMEN';
    case CORRECCION = 'CORRECCION';
    case ASIGNACION = 'ASIGNACION';
    case RESULTADO = 'RESULTADO';
    case SIN_AGENTE = 'SIN_AGENTE';
    case REASIGNACION = 'REASIGNACION';
    case CIERRE = 'CIERRE';
}

enum RamoSeguro: string
{
    case VidaProteccion = 'VidaProtección';
    case GMM = 'GMM';
    case VidaAhorro = 'VidaAhorro';
}

class Constants
{
    public const array NSE_TABLE = [
        ['nivel' => 'A/B', 'lectura' => 'Alto', 'ingresoMin' => 78700, 'ingresoMax' => PHP_INT_MAX, 'primaMin' => 3000000, 'primaMax' => 6000000],
        ['nivel' => 'C+', 'lectura' => 'Medio alto', 'ingresoMin' => 41200, 'ingresoMax' => 78700, 'primaMin' => 1500000, 'primaMax' => 3000000],
        ['nivel' => 'C', 'lectura' => 'Medio', 'ingresoMin' => 31800, 'ingresoMax' => 41200, 'primaMin' => 800000, 'primaMax' => 1500000],
        ['nivel' => 'C−', 'lectura' => 'Medio bajo', 'ingresoMin' => 21500, 'ingresoMax' => 31800, 'primaMin' => 400000, 'primaMax' => 800000],
        ['nivel' => 'D+', 'lectura' => 'Bajo alto', 'ingresoMin' => 15100, 'ingresoMax' => 21500, 'primaMin' => 150000, 'primaMax' => 400000],
        ['nivel' => 'D', 'lectura' => 'Bajo', 'ingresoMin' => 5600, 'ingresoMax' => 15100, 'primaMin' => 50000, 'primaMax' => 150000],
        ['nivel' => 'E', 'lectura' => 'Muy bajo', 'ingresoMin' => 0, 'ingresoMax' => 5600, 'primaMin' => 12000, 'primaMax' => 50000],
    ];

    public const array NSE_PRIMA_RANGES = [
        'A/B' => [3000000, 6000000],
        'C+' => [1500000, 3000000],
        'C' => [800000, 1500000],
        'C−' => [400000, 800000],
        'D+' => [150000, 400000],
        'D' => [50000, 150000],
        'E' => [12000, 50000],
    ];

    public const array ESTADOS_MEXICO = [
        'Aguascalientes',
        'Baja California',
        'Baja California Sur',
        'Campeche',
        'Chiapas',
        'Chihuahua',
        'Ciudad de México',
        'Coahuila',
        'Colima',
        'Durango',
        'Estado de México',
        'Guanajuato',
        'Guerrero',
        'Hidalgo',
        'Jalisco',
        'Michoacán',
        'Morelos',
        'Nayarit',
        'Nuevo León',
        'Oaxaca',
        'Puebla',
        'Querétaro',
        'Quintana Roo',
        'San Luis Potosí',
        'Sinaloa',
        'Sonora',
        'Tabasco',
        'Tamaulipas',
        'Tlaxcala',
        'Veracruz',
        'Yucatán',
        'Zacatecas',
    ];

    public const array RAMOS = ['VidaProtección', 'GMM', 'VidaAhorro'];

    public const array DEFAULT_WEIGHTS = [
        'especialidad' => 0.40,
        'segmento' => 0.35,
        'geografia' => 0.25,
    ];
}
