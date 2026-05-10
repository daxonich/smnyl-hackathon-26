<?php

declare(strict_types=1);

namespace App\Tests;

use App\InputValidator;
use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\Attributes\DataProvider;

final class InputValidatorTest extends TestCase
{
    // --- validateTelefono ---

    public function testTelefonoAcceptsExactly10Digits(): void
    {
        $this->assertTrue(InputValidator::validateTelefono('5512345678'));
    }

    public function testTelefonoAccepts10DigitsWithSpaces(): void
    {
        $this->assertTrue(InputValidator::validateTelefono('55 1234 5678'));
    }

    public function testTelefonoRejectsFewerThan10Digits(): void
    {
        $this->assertFalse(InputValidator::validateTelefono('551234567'));
    }

    public function testTelefonoRejectsMoreThan10Digits(): void
    {
        $this->assertFalse(InputValidator::validateTelefono('55123456789'));
    }

    public function testTelefonoRejectsNonNumericCharacters(): void
    {
        $this->assertFalse(InputValidator::validateTelefono('55-1234-5678'));
    }

    public function testTelefonoRejectsLetters(): void
    {
        $this->assertFalse(InputValidator::validateTelefono('abcdefghij'));
    }

    public function testTelefonoRejectsEmptyString(): void
    {
        $this->assertFalse(InputValidator::validateTelefono(''));
    }

    public function testTelefonoRejectsCountryCodePrefix(): void
    {
        $this->assertFalse(InputValidator::validateTelefono('+525512345678'));
    }

    // --- validateCorreo ---

    public function testCorreoAcceptsValidEmail(): void
    {
        $this->assertTrue(InputValidator::validateCorreo('user@example.com'));
    }

    public function testCorreoAcceptsEmailWithSubdomain(): void
    {
        $this->assertTrue(InputValidator::validateCorreo('user@mail.example.com'));
    }

    public function testCorreoAcceptsEmailWithDotsInLocalPart(): void
    {
        $this->assertTrue(InputValidator::validateCorreo('first.last@example.com'));
    }

    public function testCorreoRejectsMissingAt(): void
    {
        $this->assertFalse(InputValidator::validateCorreo('userexample.com'));
    }

    public function testCorreoRejectsMissingDomain(): void
    {
        $this->assertFalse(InputValidator::validateCorreo('user@'));
    }

    public function testCorreoRejectsMissingLocalPart(): void
    {
        $this->assertFalse(InputValidator::validateCorreo('@example.com'));
    }

    public function testCorreoRejectsSpacesInEmail(): void
    {
        $this->assertFalse(InputValidator::validateCorreo('user @example.com'));
    }

    public function testCorreoRejectsMissingExtension(): void
    {
        $this->assertFalse(InputValidator::validateCorreo('user@example'));
    }

    public function testCorreoRejectsEmptyString(): void
    {
        $this->assertFalse(InputValidator::validateCorreo(''));
    }

    // --- validateCodigoPostal ---

    public function testCodigoPostalAcceptsExactly5Digits(): void
    {
        $this->assertTrue(InputValidator::validateCodigoPostal('44100'));
    }

    public function testCodigoPostalAccepts5DigitsWithSpaces(): void
    {
        $this->assertTrue(InputValidator::validateCodigoPostal('  44100  '));
    }

    public function testCodigoPostalRejectsFewerThan5Digits(): void
    {
        $this->assertFalse(InputValidator::validateCodigoPostal('4410'));
    }

    public function testCodigoPostalRejectsMoreThan5Digits(): void
    {
        $this->assertFalse(InputValidator::validateCodigoPostal('441001'));
    }

    public function testCodigoPostalRejectsNonNumericCharacters(): void
    {
        $this->assertFalse(InputValidator::validateCodigoPostal('44-10'));
    }

    public function testCodigoPostalRejectsLetters(): void
    {
        $this->assertFalse(InputValidator::validateCodigoPostal('abcde'));
    }

    public function testCodigoPostalRejectsEmptyString(): void
    {
        $this->assertFalse(InputValidator::validateCodigoPostal(''));
    }
}
