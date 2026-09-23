<?php
namespace App;

use App\Attributes\Entity as BusinessEntity;

#[BusinessEntity]
final class User
{
    private ?Team $team = null;
}

final class Team {}
