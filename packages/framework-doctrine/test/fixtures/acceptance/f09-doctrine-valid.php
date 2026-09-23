<?php
namespace App;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;

#[ORM\Entity(repositoryClass: UserRepository::class)]
final class User
{
    #[ORM\ManyToOne]
    private ?Team $team = null;
}

final class Team {}

final class UserRepository extends ServiceEntityRepository
{
    public function __construct($registry)
    {
        parent::__construct($registry, User::class);
    }
}
